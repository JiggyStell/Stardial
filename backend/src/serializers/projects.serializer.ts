/**
 * Response contract models for split projects (issue #21).
 *
 * `list_projects`/`get_project` return the raw contract record through
 * `scValToNative`, which is snake_case, includes every on-chain field, and
 * nests each project's collaborator list. Passing that record straight to
 * `res.json` made list responses carry a full collaborator array per project
 * and published internal fields the client never asked for. It also meant
 * the response shape followed the contract struct rather than an API
 * contract.
 *
 * These serializers are the single place that decides which project fields
 * cross the HTTP boundary. Nothing not named in a schema below is emitted,
 * and the output keys are stable camelCase regardless of the upstream
 * casing.
 */

import { z } from "zod";
import {
  PARTICIPANT_STATUSES,
  type ParticipantPaymentStatus,
} from "../lib/split-lifecycle.js";
import {
  asRecord,
  pickBoolean,
  pickEnum,
  pickNullableString,
  pickNumber,
  pickString,
} from "./fields.js";

export const projectCollaboratorSchema = z.object({
  address: z.string(),
  alias: z.string(),
  basisPoints: z.number().int(),
});

export const participantPaymentStatusSchema = z.object({
  address: z.string(),
  alias: z.string().nullable(),
  basisPoints: z.number().int(),
  status: z.enum(PARTICIPANT_STATUSES),
  roundId: z.string().nullable(),
  lastUpdated: z.number().nullable(),
});

/** Contract model for one item in the project list. */
export const projectSummarySchema = z.object({
  projectId: z.string(),
  title: z.string(),
  projectType: z.string(),
  owner: z.string(),
  token: z.string(),
  locked: z.boolean(),
  totalDistributed: z.string(),
  distributionRound: z.number().int(),
});

/** Contract model for `GET /splits/:projectId`. */
export const projectDetailSchema = projectSummarySchema.extend({
  balance: z.string(),
  expiresAt: z.string().nullable(),
  collaborators: z.array(projectCollaboratorSchema),
  participantPaymentStatuses: z.array(participantPaymentStatusSchema).nullable(),
});

/** Contract model for the `GET /splits` envelope. */
export const projectListResponseSchema = z.object({
  projects: z.array(projectSummarySchema),
  total: z.number().int().nonnegative(),
  start: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
  hasMore: z.boolean().optional(),
  nextCursor: z.string().nullable(),
});

export type ProjectCollaborator = z.infer<typeof projectCollaboratorSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;

function serializeCollaborator(value: unknown): ProjectCollaborator {
  const record = asRecord(value);
  return projectCollaboratorSchema.parse({
    address: pickString(record, ["address"]),
    alias: pickString(record, ["alias"]),
    basisPoints: pickNumber(record, ["basisPoints", "basis_points"]),
  });
}

function serializeParticipantPaymentStatus(value: unknown): ParticipantPaymentStatus {
  const record = asRecord(value);
  const lastUpdated = record.lastUpdated;
  return participantPaymentStatusSchema.parse({
    address: pickString(record, ["address"]),
    alias: pickNullableString(record, ["alias"]),
    basisPoints: pickNumber(record, ["basisPoints", "basis_points"]),
    status: pickEnum(record.status, PARTICIPANT_STATUSES, "unpaid"),
    roundId: pickNullableString(record, ["roundId", "round_id"]),
    lastUpdated:
      typeof lastUpdated === "number" && Number.isFinite(lastUpdated)
        ? lastUpdated
        : null,
  });
}

/**
 * Projects the full on-chain record onto the list contract model.
 * Collaborators, distribution metadata and any additive contract fields are
 * deliberately dropped: a list card renders none of them.
 */
export function serializeProjectSummary(value: unknown): ProjectSummary {
  const record = asRecord(value);
  return projectSummarySchema.parse({
    projectId: pickString(record, ["projectId", "project_id"]),
    title: pickString(record, ["title"]),
    projectType: pickString(record, ["projectType", "project_type"]),
    owner: pickString(record, ["owner"]),
    token: pickString(record, ["token"]),
    locked: pickBoolean(record, ["locked"]),
    totalDistributed: pickString(record, ["totalDistributed", "total_distributed"], "0"),
    distributionRound: pickNumber(record, ["distributionRound", "distribution_round"]),
  });
}

/**
 * Projects the full on-chain record onto the detail contract model.
 *
 * `participantPaymentStatuses` is passed explicitly: it is derived from
 * indexed payments, not part of the contract record, and stays `null` when
 * that history could not be read.
 */
export function serializeProjectDetail(
  value: unknown,
  participantPaymentStatuses: ParticipantPaymentStatus[] | null = null,
): ProjectDetail {
  const record = asRecord(value);
  const collaborators: unknown[] = Array.isArray(record.collaborators)
    ? record.collaborators
    : [];

  return projectDetailSchema.parse({
    ...serializeProjectSummary(record),
    balance: pickString(record, ["balance"], "0"),
    expiresAt: pickNullableString(record, ["expiresAt", "expires_at"]),
    collaborators: collaborators.map(serializeCollaborator),
    participantPaymentStatuses: Array.isArray(participantPaymentStatuses)
      ? participantPaymentStatuses.map(serializeParticipantPaymentStatus)
      : null,
  });
}

export function serializeProjectList(
  projects: readonly unknown[],
  total: number,
  nextCursor: string | null,
  pagination?: { start: number; limit: number; hasMore: boolean },
): ProjectListResponse {
  return projectListResponseSchema.parse({
    projects: projects.map(serializeProjectSummary),
    total,
    ...(pagination ?? {}),
    nextCursor,
  });
}

