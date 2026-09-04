import {
  getOutboxItems,
  removeFromOutbox,
  markOutboxFailure
} from "../db/outbox";

import {
  saveQuote
} from "../db/db2";

import {
  submitQuote
} from "../api/appsScript";

export async function syncOutbox():
  Promise<void> {

  if (!navigator.onLine) {
    return;
  }

  const items =
    await getOutboxItems();

  for (const item of items) {

    try {

      const result =
        await submitQuote(
          item.payload
        );

      /*
       * Server accepted quote.
       */
      const completedQuote = {
        ...item.payload,

        status: "complete" as const,

        updatedAt:
          new Date().toISOString()
      };

      await saveQuote(
        completedQuote
      );

      await removeFromOutbox(
        item.quoteId
      );

      console.log(
        `Quote ${item.quoteId} synced`,
        result
      );

    } catch (error) {

      const message =
        error instanceof Error
          ? error.message
          : "Unknown sync error";

      await markOutboxFailure(
        item.quoteId,
        message
      );

      console.error(
        `Failed to sync quote ${item.quoteId}`,
        error
      );
    }
  }
}