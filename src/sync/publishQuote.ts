import type { Quote } from "../types/db2";
import type { DB1 } from "../types/db1";
import { validateQuote } from "../pricing/validation";
import { calculateQuote } from "../pricing/quoteCalculator";
import { saveQuote,getQuote } from "../db/db2";
import { addToOutbox } from "../db/outbox";
import { generateQuotePdf } from "../pdf/generateQuotePdf";
import { syncOutbox } from "./outboxSync";
export async function publishQuote(quote:Quote,config:DB1){if(quote.status!=="draft")throw new Error("Only draft quotes can be published");const errors=validateQuote(quote,config);if(errors.length)throw new Error(errors.map(e=>`${e.path}: ${e.message}`).join("\n"));const calculated=calculateQuote(quote,config).quote;const pending:Quote={...calculated,status:"pending",versionId:config.versionId,updatedAt:new Date().toISOString()};await saveQuote(pending);await addToOutbox(pending);try{await generateQuotePdf(pending)}catch(error){console.warn("Local PDF generation failed; quote remains queued",error)}if(navigator.onLine){const failures=await syncOutbox();const ownFailure=failures.find(message=>message.startsWith(`${pending.id}:`));if(ownFailure)throw new Error(`Upload failed: ${ownFailure.slice(pending.id.length+2)}`)}return(await getQuote(pending.id))??pending}
