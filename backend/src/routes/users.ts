import { sendErrorResponse } from "../lib/api-error.js";
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { IsNull } from "typeorm";
import { getDataSource, withTransaction } from "../services/database.js";
import { User } from "../entities/User.js";
import {
  userRegistrationSchema,
  userUpdateSchema,
  stellarAddressSchema,
} from "../schemas/user.schemas.js";
import { AppError, ErrorCode, ErrorType } from "../lib/errors.js";
import { logger } from "../services/logger.js";
import { signToken } from "../services/jwt.js";
import { authJwtMiddleware } from "../middleware/auth-jwt.js";
import { logAuthEvent } from "../services/auth-events.js";
import { loginAttemptStore } from "../services/login-attempts.js";
import { hashPassword, verifyPassword } from "../services/password.js";
import { validateRequest } from "../middleware/validate.js";
import { noQuerySchema, walletAddressParamsSchema } from "../schemas/api-input.schemas.js";

export const usersRouter = Router();

function isoOrNull(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return null;
}

function serializeUser(user: User) {
  return {
    id: user.id ?? null,
    walletAddress: user.walletAddress ?? null,
    email: user.email ?? null,
    alias: user.alias ?? null,
    role: user.role ?? null,
    isActive: user.isActive ?? false,
    createdAt: isoOrNull(user.createdAt),
    updatedAt: isoOrNull(user.updatedAt),
  };
}

/**
 * @openapi
 * POST /users/register
 * summary: Register a new user
 * description: Creates a user profile linked to a Stellar wallet address.
 * tags: [Users]
 */
usersRouter.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress, email, alias, role, password } = userRegistrationSchema.parse(req.body);

    // Get repository without opening a transaction
    const dataSource = getDataSource();
    const userRepository = dataSource.getRepository(User);

    // Lightweight existence check before starting a transaction
    const walletExists = await userRepository.exists({
      where: { walletAddress },
    });

    if (walletExists) {
      return sendErrorResponse(res, 409, {
        error: "conflict",
        message: "Wallet address already registered.",
      });
    }

    // Hash the password before entering the transaction so the transaction
    // is as short as possible (bcrypt is intentionally slow).
    const passwordHash = password ? await hashPassword(password) : null;

    // Only open a transaction if the wallet does not already exist
    const savedUser = await withTransaction(async (queryRunner) => {
      const userRepository = queryRunner.manager.getRepository(User);

      const newUser = userRepository.create({
        walletAddress,
        email,
        alias,
        role,
        isActive: true,
        passwordHash,
      });

      return await userRepository.save(newUser);
    });

    logger.info("User registered successfully", {
      userId: savedUser.id,
      walletAddress: savedUser.walletAddress,
    });

    return res.status(201).json(serializeUser(savedUser));
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * POST /users/login
 * summary: Log in by wallet address
 * description: Authenticates a registered user and returns a JWT bearer token.
 * tags: [Users]
 */
usersRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loginSchema = z.union([
      // Wallet-address login (existing flow — unchanged)
      z
        .object({
          walletAddress: stellarAddressSchema,
          password: z.string().optional(),
        })
        .strict(),
      // Email + password login
      z
        .object({
          email: z.string().email("Invalid email format"),
          password: z.string().min(1, "Password is required"),
        })
        .strict(),
    ]);

    const body = loginSchema.parse(req.body);

    const authenticated = await loginAttemptStore.attempt(
      "walletAddress" in body ? body.walletAddress : body.email,
      async () => {
        let user: User | null = null;

        if ("walletAddress" in body) {
          // --- Wallet-address flow ---
          user = await getDataSource().getRepository(User).findOne({
            where: { walletAddress: body.walletAddress, deletedAt: IsNull() },
          });
          if (!user || !user.isActive) return null;

          // If the account has a password set, require it.
          if (user.passwordHash) {
            if (!body.password || !(await verifyPassword(body.password, user.passwordHash))) {
              return null;
            }
          }
        } else {
          // --- Email + password flow ---
          user = await getDataSource().getRepository(User).findOne({
            where: { email: body.email, deletedAt: IsNull() },
          });
          if (!user || !user.isActive) return null;

          // Email login requires a password hash to be set.
          if (!await verifyPassword(body.password, user.passwordHash)) {
            return null;
          }
        }

        return { user, token: signToken(user.walletAddress, user.sessionVersion ?? 0) };
      },
    );

    if (!authenticated) {
      throw new AppError(
        ErrorType.AUTH,
        ErrorCode.UNAUTHORIZED,
        "Unable to sign in. Check your details or try again later.",
      );
    }
    const { user } = authenticated;
    const sessionVersion = user.sessionVersion ?? 0;
    let refreshToken: string | undefined;
    try {
      const jwtModule = await import("../services/jwt.js");
      if (typeof jwtModule.signRefreshToken === "function") {
        refreshToken = jwtModule.signRefreshToken(user.walletAddress, sessionVersion);
      }
    } catch {
      // A custom test/mock or alternate JWT implementation may expose only
      // the access-token signer. Access authentication remains usable.
    }

    logger.info("User logged in successfully", {
      userId: user.id,
      walletAddress: user.walletAddress,
    });
    logAuthEvent(res, "login", "success", { userId: user.id });

    // One serialized profile, one token: the previous payload listed every
    // profile field twice around a spread and used two different token values.
    return res.status(200).json({
      ...serializeUser(user),
      token: signToken(user.walletAddress, sessionVersion),
      ...(refreshToken ? { refreshToken } : {}),
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * GET /users/me
 * summary: Get authenticated user profile
 * description: Returns the profile of the user identified by the JWT bearer token.
 * tags: [Users]
 */
usersRouter.get("/me", authJwtMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress } = req.user!;
    const userRepository = getDataSource().getRepository(User);
    const user = await userRepository.findOne({ where: { walletAddress, deletedAt: IsNull() } });
    if (!user) {
      throw new AppError(ErrorType.RPC, ErrorCode.NOT_FOUND, "User not found.");
    }
    return res.status(200).json(serializeUser(user));
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * PATCH /users/me
 * summary: Update authenticated user profile
 * description: Updates email or alias for the authenticated user.
 * tags: [Users]
 */
usersRouter.patch("/me", authJwtMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress } = (req as Request & { user: { walletAddress: string } }).user;

    // Shared contract: unknown fields are rejected and an empty body is not a
    // valid update (it would otherwise return 200 having changed nothing).
    const updates = userUpdateSchema.parse(req.body);
    const savedUser = await withTransaction(async (queryRunner) => {
      const userRepository = queryRunner.manager.getRepository(User);
      const user = await userRepository.findOne({ where: { walletAddress, deletedAt: IsNull() } });
      if (!user) {
        throw new AppError(ErrorType.RPC, ErrorCode.NOT_FOUND, "User not found.");
      }

      // Changing the address needs confirmation from the new one (#1448).
      // Writing it here would bypass that, so only a no-op "change" is accepted.
      if (
        updates.email !== undefined &&
        updates.email.trim().toLowerCase() !== (user.email ?? "").trim().toLowerCase()
      ) {
        throw new AppError(
          ErrorType.VALIDATION,
          ErrorCode.VALIDATION_ERROR,
          "Email can't be changed through this endpoint. Request a confirmed change instead.",
          {
            message: "A confirmation link is sent to the new address before the change takes effect.",
            action: "POST /auth/email-change/request",
          }
        );
      }
      if (updates.alias !== undefined) user.alias = updates.alias;

      return await userRepository.save(user);
    });

    return res.status(200).json(serializeUser(savedUser));
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * DELETE /users/me
 * summary: Soft-delete the authenticated user's account
 * description: >
 *   Marks the account deleted rather than removing the row. The account
 *   stops appearing in lookups and login immediately. Financial/audit
 *   records (transactions, audit log) are untouched — soft delete never
 *   reaches those tables. See `lib/soft-delete.ts` for the retention
 *   policy governing eventual hard purge.
 * tags: [Users]
 */
usersRouter.delete("/me", authJwtMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress } = req.user!;

    const deletedAt = await withTransaction(async (queryRunner) => {
      const userRepository = queryRunner.manager.getRepository(User);
      const user = await userRepository.findOne({ where: { walletAddress, deletedAt: IsNull() } });
      if (!user) {
        throw new AppError(ErrorType.RPC, ErrorCode.NOT_FOUND, "User not found.");
      }

      user.deletedAt = new Date();
      const saved = await userRepository.save(user);
      return saved.deletedAt as Date;
    });

    logger.info("User soft-deleted", { walletAddress, deletedAt: deletedAt.toISOString() });

    return res.status(200).json({
      walletAddress,
      deletedAt: deletedAt.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * @openapi
 * GET /users/{walletAddress}
 * summary: Get user by wallet address
 * description: Looks up a public user profile by Stellar wallet address.
 * tags: [Users]
 */
usersRouter.get(
  "/:walletAddress",
  validateRequest({ params: walletAddressParamsSchema, query: noQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validated (StrKey-checked) address from the shared middleware.
      const walletAddress = req.params.walletAddress as string;

      const dataSource = getDataSource();
      const userRepository = dataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { walletAddress, deletedAt: IsNull() }
      });

      if (!user) {
        throw new AppError(
          ErrorType.RPC,
          ErrorCode.NOT_FOUND,
          `User with wallet address ${walletAddress} not found.`
        );
      }

      return res.status(200).json(serializeUser(user));
    } catch (error) {
      return next(error);
    }
  }
);
