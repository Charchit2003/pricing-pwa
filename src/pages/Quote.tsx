import {
  useEffect,
  useState
} from "react";

import type {
  DB1
} from "../types/db1";

import type {
  Quote,
  QuoteSection
} from "../types/db2";

import {
  MaterialSection
} from "./MaterialSection";

import {
  createQuote
} from "../utils/quote";

import {
  saveQuote
} from "../db/db2";

// Import this from wherever you implemented publishing.
// Adjust the path if required.
import {
  publishQuote
} from "../sync/publishQuote";

interface QuotePageProps {
  config: DB1;
}

export function QuotePage({
  config
}: QuotePageProps) {

  const [quote, setQuote] =
    useState<Quote>(
      () => createQuote(config)
    );

  /*
   * Auto-save draft whenever quote changes.
   */
  useEffect(() => {

    if (!quote.displayName.trim()) {
      return;
    }

    const timeout =
      window.setTimeout(
        async () => {

          try {

            await saveQuote(quote);

            console.log(
              "Draft auto-saved"
            );

          } catch (error) {

            console.error(
              "Failed to save draft",
              error
            );

          }

        },
        500
      );

    return () =>
      window.clearTimeout(timeout);

  }, [quote]);


  function updateDisplayName(
    value: string
  ) {

    setQuote(
      current => ({
        ...current,
        displayName: value,
        updatedAt:
          new Date().toISOString()
      })
    );

  }


  function updateSection(
    sheetName: string,
    section: QuoteSection
  ) {

    setQuote(
      current => ({
        ...current,

        sections: {
          ...current.sections,

          [sheetName]: section
        },

        updatedAt:
          new Date().toISOString()
      })
    );

  }


  async function handleSave() {

    if (!quote.displayName.trim()) {

      alert(
        "Customer / Quote Name is required."
      );

      return;
    }

    try {

      await saveQuote(quote);

      alert(
        "Quote saved as draft."
      );

    } catch (error) {

      console.error(
        "Failed to save quote",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to save quote"
      );

    }

  }


  async function handlePublish() {

    if (!quote.displayName.trim()) {

      alert(
        "Customer / Quote Name is required."
      );

      return;
    }

    try {

      /*
       * publishQuote should:
       *
       * 1. Validate the quote
       * 2. Recalculate using current DB1
       * 3. Set status = pending
       * 4. Save quote to DB2
       * 5. Add quote to outbox
       * 6. Attempt immediate sync if online
       */
      const pendingQuote =
        await publishQuote(
          quote,
          config
        );

      setQuote(
        pendingQuote
      );

      alert(
        navigator.onLine
          ? "Quote published. It will be uploaded automatically."
          : "Quote published locally. It will sync automatically when you are online."
      );

    } catch (error) {

      console.error(
        "Failed to publish quote",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Unable to publish quote"
      );

    }

  }


  return (
    <div className="quote-page">

      <header>

        <h1>
          New Quote
        </h1>


        <div className="form-field">

          <label>
            Customer / Quote Name *
          </label>

          <input
            value={
              quote.displayName
            }

            onChange={
              event =>
                updateDisplayName(
                  event.target.value
                )
            }

            placeholder="ABC Customer"
          />

        </div>

      </header>


      <main>

        {[...config.sheets]
          .sort(
            (a, b) =>
              a.order - b.order
          )
          .map(
            sheet => (

              <MaterialSection
                key={
                  sheet.sheetName
                }

                sheet={sheet}

                brandingOptions={
                  config.branding
                }

                laborOptions={
                  config.labor
                }

                value={
                  quote.sections[
                    sheet.sheetName
                  ]
                }

                onChange={
                  section =>
                    updateSection(
                      sheet.sheetName,
                      section
                    )
                }
              />

            )
          )}

      </main>


      <footer>

        <button
          type="button"
          onClick={handleSave}
          disabled={
            !quote.displayName.trim()
          }
        >
          Save Quote
        </button>


        <button
          type="button"
          onClick={handlePublish}
          disabled={
            !quote.displayName.trim()
          }
        >
          Publish Quote
        </button>

      </footer>

    </div>
  );
}
