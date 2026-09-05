import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { DB1 } from "../types/db1";
import type {
  Quote,
  QuoteSection,
} from "../types/db2";

import { MaterialSection } from "./MaterialSection";
import { createQuote } from "../utils/quote";
import { saveQuote } from "../db/db2";
import { publishQuote } from "../sync/publishQuote";
import { recalculateDraft } from "../pricing/reCalculateDraft";
import { calculateQuote } from "../pricing/quoteCalculator";

interface Props {
  config: DB1;
  initialQuote?: Quote | null;
  onBack: () => void;
}

export function QuotePage({
  config,
  initialQuote,
  onBack,
}: Props) {
  const [quote, setQuote] =
    useState<Quote>(() =>
      initialQuote
        ? recalculateDraft(
            initialQuote,
            config,
          )
        : createQuote(config),
    );

  const [publishing, setPublishing] =
    useState(false);

  useEffect(() => {
    if (quote.status !== "draft") return;

    const t = window.setTimeout(
      () =>
        void saveQuote(quote).catch(
          console.error,
        ),
      400,
    );

    return () => clearTimeout(t);
  }, [quote]);

  const calculation = useMemo(() => {
    try {
      return calculateQuote(
        quote,
        config,
      );
    } catch (error) {
      console.error(
        "Quote calculation failed:",
        error,
      );

      return {
        quote: {
          ...quote,
          finalResult: {
            R_Cost:
              Number.isFinite(
                quote.finalResult?.R_Cost,
              )
                ? quote.finalResult.R_Cost
                : 0,
          },
        },
        errors: [
          {
            sheetName: "",
            materialId: "",
            material: "",
            message:
              error instanceof Error
                ? error.message
                : "Quote calculation failed",
          },
        ],
      };
    }
  }, [quote, config]);

  const liveQuote = calculation.quote;

  const liveTotal =
    Number.isFinite(
      liveQuote.finalResult?.R_Cost,
    )
      ? liveQuote.finalResult.R_Cost
      : 0;

  const update = (
    patch: Partial<Quote>,
  ) =>
    setQuote((q) => ({
      ...q,
      ...patch,
      updatedAt:
        new Date().toISOString(),
    }));

  const updateSection = (
    name: string,
    section: QuoteSection,
  ) =>
    setQuote((q) => ({
      ...q,
      sections: {
        ...q.sections,
        [name]: section,
      },
      updatedAt:
        new Date().toISOString(),
    }));

  async function save() {
    await saveQuote(liveQuote);

    setQuote(liveQuote);

    alert("Quote saved as draft.");
  }

  async function publish() {
    setPublishing(true);

    try {
      const pending =
        await publishQuote(
          quote,
          config,
        );

      setQuote(pending);

      alert(
        navigator.onLine
          ? "Quote queued for upload."
          : "Quote saved offline and will upload when online.",
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to publish quote",
      );
    } finally {
      setPublishing(false);
    }
  }

  const sortedSheets =
    config.sheets
      .slice()
      .sort(
        (a, b) =>
          a.order - b.order,
      );

  return (
    <div className="quote-page">
      <header className="quote-sticky-header">
        <div className="quote-title-row">
          <button onClick={onBack}>
            ← Back
          </button>

          <div>
            <h1>
              {quote.status === "draft"
                ? "Quote"
                : "Published Quote"}
            </h1>

            <span>
              DB1 v{quote.versionId}
            </span>
          </div>

          <div className="quote-total">
            ₹{liveTotal.toFixed(2)}
          </div>
        </div>

        <div className="form-field">
          <label>
            Customer / Quote Name *
          </label>

          <input
            disabled={
              quote.status !== "draft"
            }
            value={quote.displayName}
            onChange={(e) =>
              update({
                displayName:
                  e.target.value,
              })
            }
            placeholder="ABC Customer"
          />
        </div>

        {calculation.errors.length >
          0 && (
          <div className="quote-calculation-warning">
            <strong>
              Some material calculations
              have errors.
            </strong>

            <span>
              The total shown above is a
              partial total and excludes
              invalid material costs.
            </span>
          </div>
        )}
      </header>

      <nav className="section-nav">
        <a href="#quote-top">
          Top
        </a>

        {sortedSheets.map((s) => (
          <a
            key={s.sheetName}
            href={`#section-${encodeURIComponent(
              s.sheetName,
            )}`}
          >
            {s.sheetName}
          </a>
        ))}
      </nav>

      <main id="quote-top">
        {sortedSheets.map(
          (sheet) => (
            <div
              id={`section-${encodeURIComponent(
                sheet.sheetName,
              )}`}
              key={sheet.sheetName}
            >
              <MaterialSection
                sheet={sheet}
                brandingOptions={
                  config.branding
                }
                laborOptions={
                  config.labor
                }
                value={
                  liveQuote.sections[
                    sheet.sheetName
                  ]
                }
                readOnly={
                  quote.status !==
                  "draft"
                }
                onChange={(
                  section: QuoteSection,
                ) =>
                  updateSection(
                    sheet.sheetName,
                    section,
                  )
                }
              />
            </div>
          ),
        )}
      </main>

      <footer className="quote-actions">
        <strong>
          Total: ₹{liveTotal.toFixed(2)}
        </strong>

        <button
          disabled={
            quote.status !== "draft"
          }
          onClick={() =>
            void save()
          }
        >
          Save Draft
        </button>

        <button
          disabled={
            quote.status !== "draft" ||
            publishing
          }
          onClick={() =>
            void publish()
          }
        >
          {publishing
            ? "Publishing…"
            : "Publish Quote"}
        </button>
      </footer>
    </div>
  );
}