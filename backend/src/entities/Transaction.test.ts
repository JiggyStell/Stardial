import { describe, expect, it } from "vitest";
import { getMetadataArgsStorage } from "typeorm";

import {
  TRANSACTION_STATUSES,
  TransactionRecord,
} from "./Transaction.js";

describe("TransactionRecord entity", () => {
  it("maps to the transactions table with the expected columns", () => {
    const tables = getMetadataArgsStorage().tables.filter(
      (table) => table.target === TransactionRecord,
    );
    const columns = getMetadataArgsStorage().columns.filter(
      (column) => column.target === TransactionRecord,
    );
    const indexes = getMetadataArgsStorage().indices.filter(
      (index) => index.target === TransactionRecord,
    );

    expect(tables).toHaveLength(1);
    expect(tables[0]?.name).toBe("transactions");

    expect(columns.map((column) => column.propertyName).sort()).toEqual(
      ["amount", "id", "recipient", "roundId", "status", "timestamp", "txHash", "token"].sort(),
    );

    expect(indexes.map((index) => index.name).sort()).toEqual(
      [
        "IDX_transactions_recipient",
        "IDX_transactions_recipient_timestamp",
        "IDX_transactions_recipient_timestamp_id",
        "IDX_transactions_round_id",
        "IDX_transactions_timestamp",
        "IDX_transactions_timestamp_id",
        "IDX_transactions_tx_hash",
      ].sort(),
    );

    expect(TRANSACTION_STATUSES).toEqual(["pending", "completed", "failed"]);
  });
});
