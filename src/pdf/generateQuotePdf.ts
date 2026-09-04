// generateQuotePdf.ts

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import type {
  Quote
} from "../types/db2";

function createSectionsHtml(
  quote: Quote
): string {

  return Object.entries(
    quote.sections
  )
    .map(
      ([sectionName, section]) => {

        const materials =
          section.materials
            .map(material => {

              const questions =
                Object.entries(
                  material.questions
                )
                  .map(
                    ([, question]) => `
                      <tr>
                        <td>
                          ${escapeHtml(
                            question.name
                          )}
                        </td>

                        <td>
                          ${formatNumber(
                            question.value
                          )}
                        </td>
                      </tr>
                    `
                  )
                  .join("");

              const cost =
                findResultValue(
                  material.results,
                  "R_Cost"
                );

              return `
                <h3>
                  ${escapeHtml(
                    material.material
                  )}
                </h3>

                <table>
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Value</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${questions}
                  </tbody>
                </table>

                <p>
                  <strong>Cost:</strong>
                  ₹${formatNumber(cost)}
                </p>
              `;
            })
            .join("");

        return `
          <h2>
            ${escapeHtml(sectionName)}
          </h2>

          ${materials}

          <p>
            <strong>Branding:</strong>
            ${escapeHtml(
              section.branding.type
            )}
            — ₹${formatNumber(
              section.branding.cost
            )}
          </p>

          <p>
            <strong>Labor:</strong>
            ${escapeHtml(
              section.labor.type
            )}
            — ₹${formatNumber(
              section.labor.cost
            )}
          </p>
        `;
      }
    )
    .join("");
}

function findResultValue(
  results: Quote["sections"][string]["materials"][number]["results"],
  resultName: string
): number | undefined {

  const canonicalName =
    resultName
      .trim()
      .toUpperCase();

  const key =
    Object.keys(results).find(
      resultKey =>
        resultKey
          .trim()
          .toUpperCase() ===
        canonicalName
    );

  if (!key) {
    return undefined;
  }

  return results[key]?.value;
}

function formatNumber(
  value: number | undefined
): string {

  if (
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "-";
  }

  return value.toFixed(2);
}

function sanitizeFileName(
  value: string
): string {

  return (
    value
      .trim()
      .replace(
        /[^a-zA-Z0-9-_ ]/g,
        ""
      )
      .replace(
        /\s+/g,
        "_"
      )
      .slice(0, 80) ||
    "quotation"
  );
}

function escapeHtml(
  value: string
): string {

  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

export async function generateQuotePdf(
  quote: Quote
): Promise<void> {

  const element =
    createPrintableElement(
      quote
    );

  document.body.appendChild(
    element
  );

  try {

    const canvas =
      await html2canvas(
        element,
        {
          scale: 2,
          backgroundColor:
            "#ffffff",
          useCORS: true
        }
      );

    const imageData =
      canvas.toDataURL(
        "image/png"
      );

    const pdf =
      new jsPDF({
        orientation:
          "portrait",
        unit: "mm",
        format: "a4"
      });

    const pageWidth =
      pdf.internal.pageSize
        .getWidth();

    const pageHeight =
      pdf.internal.pageSize
        .getHeight();

    const margin = 10;

    const imageWidth =
      pageWidth -
      margin * 2;

    const imageHeight =
      canvas.height *
      imageWidth /
      canvas.width;

    const printablePageHeight =
      pageHeight -
      margin * 2;

    let remainingHeight =
      imageHeight;

    let position =
      margin;

    pdf.addImage(
      imageData,
      "PNG",
      margin,
      position,
      imageWidth,
      imageHeight
    );

    remainingHeight -=
      printablePageHeight;

    while (
      remainingHeight > 0
    ) {

      position -=
        printablePageHeight;

      pdf.addPage();

      pdf.addImage(
        imageData,
        "PNG",
        margin,
        position,
        imageWidth,
        imageHeight
      );

      remainingHeight -=
        printablePageHeight;
    }

    pdf.save(
      `${sanitizeFileName(
        quote.displayName
      )}_${quote.id}.pdf`
    );

  } finally {

    if (
      element.parentNode
    ) {
      element.parentNode.removeChild(
        element
      );
    }
  }
}

function createPrintableElement(
  quote: Quote
): HTMLElement {

  const container =
    document.createElement(
      "div"
    );

  container.style.position =
    "absolute";

  container.style.left =
    "-10000px";

  container.style.top =
    "0";

  container.style.width =
    "800px";

  container.style.padding =
    "40px";

  container.style.background =
    "white";

  container.style.color =
    "black";

  container.style.fontFamily =
    "Arial, sans-serif";

  container.style.boxSizing =
    "border-box";

  const style =
    document.createElement(
      "style"
    );

  style.textContent = `
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    th {
      border: 1px solid #ccc;
      padding: 6px;
      text-align: left;
      background: #f5f5f5;
    }

    td {
      border: 1px solid #ccc;
      padding: 6px;
    }

    h1 {
      margin-bottom: 20px;
    }

    h2 {
      margin-top: 24px;
      margin-bottom: 12px;
    }

    h3 {
      margin-top: 16px;
      margin-bottom: 8px;
    }

    p {
      margin: 8px 0;
    }

    hr {
      border: none;
      border-top: 1px solid #ccc;
      margin: 20px 0;
    }
  `;

  container.appendChild(
    style
  );

  container.innerHTML += `
    <h1>Quotation</h1>

    <p>
      <strong>Quote:</strong>
      ${escapeHtml(
        quote.displayName
      )}
    </p>

    <p>
      <strong>Quote ID:</strong>
      ${escapeHtml(
        quote.id
      )}
    </p>

    <p>
      <strong>
        Configuration Version:
      </strong>
      ${quote.versionId}
    </p>

    <hr />

    ${createSectionsHtml(
      quote
    )}

    <hr />

    <h2>
      Final Rate:
      ₹${formatNumber(
        quote.finalResult.R_Cost
      )}
    </h2>
  `;

  return container;
}