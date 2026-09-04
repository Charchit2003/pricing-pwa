// src/pricing/recalculateDraft.ts

import type {
  DB1
} from "../types/db1";

import type {
  Quote
} from "../types/db2";

import {
  calculateQuote
} from "./quoteCalculator";

export function recalculateDraft(
  quote: Quote,
  config: DB1
): Quote {

  if (
    quote.status !== "draft"
  ) {
    return quote;
  }

  const recalculated =
    calculateQuote(
      quote,
      config
    );

  return {
    ...recalculated.quote,

    versionId:
      config.versionId,

    updatedAt:
      new Date().toISOString()
  };
}