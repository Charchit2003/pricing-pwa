import {
  getDatabase
} from "./database";

import type {
  Quote
} from "../types/db2";

export interface OutboxItem {
  quoteId: string;

  payload: Quote;

  retryCount: number;

  createdAt: string;

  lastAttemptAt?: string;

  lastError?: string;
}

export async function addToOutbox(
  quote: Quote
): Promise<void> {

  const db =
    await getDatabase();

  const existing =
    await db.get(
      "outbox",
      quote.id
    );

  await db.put(
    "outbox",
    {
      quoteId: quote.id,

      payload: quote,

      retryCount:
        existing?.retryCount ?? 0,

      createdAt:
        existing?.createdAt ??
        new Date().toISOString(),

      lastAttemptAt:
        existing?.lastAttemptAt,

      lastError:
        existing?.lastError
    },
    quote.id
  );
}

export async function getOutboxItems():
  Promise<OutboxItem[]> {

  const db =
    await getDatabase();

  return db.getAll(
    "outbox"
  );
}

export async function removeFromOutbox(
  quoteId: string
): Promise<void> {

  const db =
    await getDatabase();

  await db.delete(
    "outbox",
    quoteId
  );
}

export async function markOutboxFailure(
  quoteId: string,
  error: string
): Promise<void> {

  const db =
    await getDatabase();

  const item =
    await db.get(
      "outbox",
      quoteId
    );

  if (!item) {
    return;
  }

  await db.put(
    "outbox",
    {
      ...item,

      retryCount:
        item.retryCount + 1,

      lastAttemptAt:
        new Date().toISOString(),

      lastError:
        error
    },
    quoteId
  );
}