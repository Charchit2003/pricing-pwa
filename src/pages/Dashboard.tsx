import {
  useEffect,
  useState
} from "react";

import type {
  Quote
} from "../types/db2";

import {
  getAllQuotes
} from "../db/db2";

interface DashboardProps {
  onOpenQuote: (
    quote: Quote
  ) => void;

  onNewQuote: () => void;
}

export function Dashboard({
  onOpenQuote,
  onNewQuote
}: DashboardProps) {

  const [quotes, setQuotes] =
    useState<Quote[]>([]);

  const [loading, setLoading] =
    useState(true);

  async function loadQuotes() {

    setLoading(true);

    try {

      const data =
        await getAllQuotes();

      data.sort(
        (a, b) =>
          b.updatedAt.localeCompare(
            a.updatedAt
          )
      );

      setQuotes(data);

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuotes();
  }, []);

  if (loading) {
    return (
      <div>
        Loading quotes...
      </div>
    );
  }

  return (
    <div className="dashboard">

      <header className="dashboard-header">

        <div>
          <h1>
            Quotations
          </h1>

          <p>
            Offline pricing dashboard
          </p>
        </div>

        <button
          type="button"
          onClick={onNewQuote}
        >
          + New Quote
        </button>

      </header>

      {quotes.length === 0 ? (

        <div className="empty-state">

          <h2>
            No quotations yet
          </h2>

          <button
            type="button"
            onClick={onNewQuote}
          >
            Create your first quote
          </button>

        </div>

      ) : (

        <div className="quote-list">

          {quotes.map(
            quote => (

              <button
                className="quote-row"
                key={quote.id}
                type="button"
                onClick={() =>
                  onOpenQuote(
                    quote
                  )
                }
              >

                <div>
                  <strong>
                    {quote.displayName ||
                      "Unnamed Quote"}
                  </strong>

                  <small>
                    {quote.id}
                  </small>
                </div>

                <div>
                  <span>
                    {quote.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  ₹
                  {(
                    quote.finalResult.R_Cost ??
                    0
                  ).toFixed(2)}
                </div>

                <div>
                  {formatDate(
                    quote.updatedAt
                  )}
                </div>

              </button>

            )
          )}

        </div>

      )}

    </div>
  );
}

function formatDate(
  value: string
): string {

  return new Date(
    value
  ).toLocaleString();
}