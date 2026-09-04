import { getOutboxItems,removeFromOutbox,markOutboxFailure } from "../db/outbox";
import { saveQuote } from "../db/db2";
import { submitQuote } from "../api/appsScript";
let running:Promise<void>|null=null;
export function syncOutbox(){if(running)return running;running=(async()=>{if(!navigator.onLine)return;for(const item of await getOutboxItems()){if(!navigator.onLine)break;try{await submitQuote(item.payload);await saveQuote({...item.payload,status:"complete",updatedAt:new Date().toISOString()});await removeFromOutbox(item.quoteId);}catch(error){await markOutboxFailure(item.quoteId,error instanceof Error?error.message:"Unknown sync error");}}})().finally(()=>{running=null});return running}
