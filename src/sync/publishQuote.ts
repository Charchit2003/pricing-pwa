import type {
  Quote
} from "../types/db2";

import type {
  DB1
} from "../types/db1";

import {
  validateQuote
} from "../pricing/validation";

import {
  calculateQuote
} from "../pricing/quoteCalculator";

import {
  saveQuote
} from "../db/db2";

import {
  addToOutbox
} from "../db/outbox";

import {
  generateQuotePdf
} from "../pdf/generateQuotePdf";

export async function publishQuote(
  quote: Quote,
  config: DB1
): Promise<Quote> {

  /*
   * 1. Validate
   */
  const errors =
    validateQuote(
      quote,
      config
    );

  if (errors.length > 0) {

    throw new Error(
      errors
        .map(
          error =>
            `${error.path}: ${error.message}`
        )
        .join("\n")
    );
  }

  /*
   * 2. Calculate
   */
  const calculated =
    calculateQuote(
      quote,
      config
    ).quote;

  /*
   * 3. Mark PENDING
   */
  const pendingQuote: Quote = {
    ...calculated,

    status: "pending",

    versionId:
      config.versionId,

    updatedAt:
      new Date().toISOString()
  };

  /*
   * 4. Persist FIRST.
   *
   * This guarantees that if PDF generation
   * fails, the quote still exists.
   */
  await saveQuote(
    pendingQuote
  );

  /*
   * 5. Put into offline outbox.
   */
  await addToOutbox(
    pendingQuote
  );

  /*
   * 6. Generate local PDF.
   */
  await generateQuotePdf(
    pendingQuote
  );

  return pendingQuote;
}