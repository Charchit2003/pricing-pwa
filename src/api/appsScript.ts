
import type { Quote } from "../types/db2";

const API_URL =
  import.meta.env.VITE_APPS_SCRIPT_URL;


export async function fetchDB1() {

  const url =
    `${API_URL}?action=config`;

  const response =
    await fetch(url, {
      method: "GET"
    });


  if (!response.ok) {

    throw new Error(
      `Config request failed: ${response.status}`
    );
  }


  const body =
    await response.json();


  if (!body.success) {

    throw new Error(
      body.error || "Failed to load configuration"
    );
  }


  return body.data;
}


export async function submitQuote(
  quote: Quote
) {

  const formData =
    new URLSearchParams();

  formData.append(
    "action",
    "submitQuote"
  );

  formData.append(
    "payload",
    JSON.stringify(quote)
  );


  const response =
    await fetch(
      API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      }
    );


  if (!response.ok) {

    throw new Error(
      `Quote submission failed: ${response.status}`
    );
  }


  const result =
    await response.json();


  if (!result.success) {

    throw new Error(
      result.error ||
      "Quote submission failed"
    );
  }


  return result;
}