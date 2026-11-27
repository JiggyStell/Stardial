import type { Request, Response, NextFunction } from "express";
import {
  projectIdParamSchema,
  lockProjectSchema,
  depositSchema,
  listProjectsSchema,
} from "../schemas/splits.js";
import { AppError, ErrorCode, ErrorType } from "../lib/errors.js";
import {
  buildDepositUnsignedXdr,
  buildLockProjectUnsignedXdr,
  decodeCursor,
  encodeCursor,
  fetchProjectById,
  listProjects as listProjectsService,
  simulateReadOnlyContractCall,
} from "../services/splits.service.js";
import {
  serializeProjectDetail,
  serializeProjectList,
} from "../serializers/projects.serializer.js";
import { recordProjectEdit } from "../services/project-history.js";
import { contractU32Schema } from "../schemas/stellar-rpc.schemas.js";
import { decodeContractValue } from "../services/rpc-response-validation.js";
import {
  deriveParticipantStatuses,
  type Collaborator,
  type ParticipantPaymentStatus,
} from "../lib/split-lifecycle.js";
import { createPayoutHistoryService } from "../services/PayoutHistoryService.js";
import { logger } from "../services/logger.js";
import { invalidateCache, invalidateCacheByPrefix } from "../services/stellar.js";

export class SplitsController {
  private readonly payoutHistoryService = createPayoutHistoryService();

  /**
   * List projects with pagination, search and type filtering.
   */
  async listProjects(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const parsed = listProjectsSchema.safeParse(req.query);

      if (!parsed.success) {
        throw new AppError(
          ErrorType.VALIDATION,
          ErrorCode.VALIDATION_ERROR,
          "Invalid query parameters.",
          undefined,
          parsed.error.flatten(),
        );
        //   throw new AppError(
        //   ErrorType.VALIDATION,
        //   ErrorCode.VALIDATION_ERROR,
        //   "Invalid request payload.",
        //   undefined,
        //   parsed.error.flatten()
        // );
      }

      let { start, limit, search, type, cursor } = parsed.data;

      // Cursor takes precedence over the explicit start value.
      if (cursor) {
        try {
          start = decodeCursor(cursor);
        } catch {
          throw new AppError(
            ErrorType.VALIDATION,
            ErrorCode.VALIDATION_ERROR,
            "Invalid pagination cursor.",
          );
        }
      }

      // Read the page before the count so the two simulator calls cannot
      // interleave, then serialize through the list contract model.
      const projects = await listProjectsService(start, limit, search, type);
      const total = await simulateReadOnlyContractCall("get_project_count");

      const totalCount = total
        ? decodeContractValue("simulateTransaction:get_project_count", contractU32Schema, total)
        : 0;

      const hasMore = start + projects.length < totalCount;
      const nextCursor = hasMore ? encodeCursor(start + projects.length) : null;

      return res.status(200).json(
        serializeProjectList(projects, totalCount, nextCursor, {
          start,
          limit,
          hasMore,
        }),
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get a project by ID.
   */
  async getProject(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const projectId = projectIdParamSchema.parse(req.params.projectId);

      const project = await fetchProjectById(projectId);
      if (!project)
        throw new AppError(ErrorType.RPC, ErrorCode.NOT_FOUND, `Project ${projectId} not found.`);

      // fetchProjectById decodes the contract response into an untyped record;
      // collaborators are only present once the project has been read on-chain.
      const projectRecord = project as Record<string, unknown> & { collaborators?: Collaborator[] };

      let participantPaymentStatuses: ParticipantPaymentStatus[] | null = null;
      try {
        const payments = await this.payoutHistoryService.getPayoutsByRound(projectId);
        participantPaymentStatuses = deriveParticipantStatuses(
          projectRecord.collaborators ?? [],
          payments,
        );
      } catch (error) {
        logger.warn("Participant payment statuses unavailable", { projectId, error });
      }

      return res.status(200).json(
        serializeProjectDetail(projectRecord, participantPaymentStatuses),
      );
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Build an unsigned XDR transaction for locking a project.
   */
  async lockProject(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const projectId = projectIdParamSchema.parse(req.params.projectId);
      const body = lockProjectSchema.parse(req.body);
      const result = await buildLockProjectUnsignedXdr({ projectId, owner: body.owner });
      await recordProjectEdit(projectId, body.owner, "lock", { locked: true });
      // Evict cached project/list data; the lock state changes once the
      // transaction is submitted (same pattern as deposit).
      // The on-chain project becomes permanently locked; cached reads are stale.
      invalidateCache(`project:${projectId}`);
      invalidateCacheByPrefix("list_projects:");
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Build an unsigned XDR transaction for depositing into a project.
   */
  async deposit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    try {
      const projectId = projectIdParamSchema.parse(req.params.projectId);
      const body = depositSchema.parse(req.body);
      const result = await buildDepositUnsignedXdr({
        projectId,
        from: body.from,
        amount: body.amount,
        token: body.token,
      });
      invalidateCache(`project:${projectId}`);
      invalidateCacheByPrefix("list_projects:");
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
}