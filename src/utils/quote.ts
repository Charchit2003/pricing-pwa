import type {
  DB1
} from "../types/db1";

import type {
  Quote,
  QuoteSection
} from "../types/db2";

export function createQuote(
  config: DB1
): Quote {

  const sections:
    Record<string, QuoteSection> = {};

  for (const sheet of config.sheets) {

    sections[sheet.sheetName] = {
      materials: [],

      branding: {
        type: "",
        cost: 0
      },

      labor: {
        type: "",
        cost: 0
      }
    };
  }

  const now =
    new Date().toISOString();

  return {
    id: crypto.randomUUID(),

    displayName: "",

    versionId:
      config.versionId,

    createdAt: now,
    updatedAt: now,

    status: "draft",

    sections,

    finalResult: {
      R_Cost: 0
    }
  };
}