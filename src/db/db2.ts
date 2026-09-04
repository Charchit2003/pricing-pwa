import {
  getDatabase
} from "./database";

import type {
  Quote,
  QuoteStatus
} from "../types/db2";

export async function saveQuote(
  quote: Quote
): Promise<void> {

  const db =
    await getDatabase();

  await db.put(
    "quotes",
    quote
  );
}

export async function getQuote(
  id: string
): Promise<Quote | undefined> {

  const db =
    await getDatabase();

  return db.get(
    "quotes",
    id
  );
}

export async function getAllQuotes(): Promise<Quote[]> {

  const db =
    await getDatabase();

  return db.getAll(
    "quotes"
  );
}

export async function getQuotesByStatus(
  status: QuoteStatus
): Promise<Quote[]> {

  const db =
    await getDatabase();

  return db.getAllFromIndex(
    "quotes",
    "by-status",
    status
  );
}

export async function deleteQuote(
  id: string
): Promise<void> {

  const db =
    await getDatabase();

  await db.delete(
    "quotes",
    id
  );
}