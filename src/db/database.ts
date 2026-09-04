import { openDB } from "idb";
import type { DBSchema, IDBPDatabase } from "idb";

import type { DB1 } from "../types/db1";
import type { Quote } from "../types/db2";

interface PricingDB extends DBSchema {

  db1: {
    key: string;
    value: DB1;
  };

  quotes: {
    key: string;
    value: Quote;
    indexes: {
      "by-status": string;
      "by-updatedAt": string;
    };
  };

outbox: {
  key: string;

  value: {
    quoteId: string;

    payload: Quote;

    retryCount: number;

    createdAt: string;

    lastAttemptAt?: string;

    lastError?: string;
  };
};
}

let databasePromise:
  Promise<IDBPDatabase<PricingDB>> | null = null;


export function getDatabase() {

  if (!databasePromise) {

    databasePromise = openDB<PricingDB>(
      "pricing-pwa",
      1,
      {
        upgrade(db) {

          /*
           * DB1
           *
           * Only one active configuration.
           */
          if (!db.objectStoreNames.contains("db1")) {

            db.createObjectStore("db1");
          }


          /*
           * DB2
           *
           * Quotes/drafts.
           */
          if (!db.objectStoreNames.contains("quotes")) {

            const store =
              db.createObjectStore(
                "quotes",
                {
                  keyPath: "id"
                }
              );

            store.createIndex(
              "by-status",
              "status"
            );

            store.createIndex(
              "by-updatedAt",
              "updatedAt"
            );
          }


          /*
           * Offline submission queue.
           */
          if (!db.objectStoreNames.contains("outbox")) {

            db.createObjectStore(
              "outbox",
              {
                keyPath: "quoteId"
              }
            );
          }
        }
      }
    );
  }

  return databasePromise;
}