import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";
import { DEFAULT_USER_ROLE, USER_ROLES } from "../lib/user-roles.js";

// Stellar address validator
export const stellarAddressSchema = z
  .string()
  .min(1, "wallet address is required")
  .refine((val) => StrKey.isValidEd25519PublicKey(val), {
    message: "Must be a valid Stellar account ID (G…)",
  });

// User registration schema
export const userRegistrationSchema = z.object({
  walletAddress: stellarAddressSchema,
  email: z.string().email("Invalid email format").optional(),
  alias: z.string().min(1, "Alias is required").max(64, "Alias must be at most 64 characters").optional(),
  role: z.enum(USER_ROLES).default(DEFAULT_USER_ROLE),
  /**
   * Optional password for email+password authentication (#6).
   * When provided it is hashed with bcrypt (cost 12) before storage.
   * Accounts without a password can still authenticate via wallet address.
   */
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .optional(),
}).strict();


// User response schema
export const userResponseSchema = z.object({
  id: z.string().uuid(),
  walletAddress: z.string(),
  email: z.string().nullable().optional(),
  alias: z.string().nullable().optional(),
  role: z.enum(USER_ROLES),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const userUpdateSchema = z
  .object({
    email: userRegistrationSchema.shape.email,
    alias: userRegistrationSchema.shape.alias,
  })
  .strict()
  .refine((value) => value.email !== undefined || value.alias !== undefined, {
    message: "At least one of email or alias must be provided",
  });

export type UserUpdate = z.infer<typeof userUpdateSchema>;

export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserResponse = z.infer<typeof userResponseSchema>;
