import { getOutboxItems,removeFromOutbox,markOutboxFailure } from "../db/outbox";
import { saveQuote } from "../db/db2";
import { submitQuote } from "../api/appsScript";

let running:Promise<string[]>|null=null;

export function syncOutbox(){
  if(running)return running;
  running=(async()=>{
    const failures:string[]=[];
    if(!navigator.onLine)return failures;
    for(const item of await getOutboxItems()){
      if(!navigator.onLine)break;
      try{
        await submitQuote(item.payload);
        await saveQuote({...item.payload,status:"complete",updatedAt:new Date().toISOString()});
        await removeFromOutbox(item.quoteId);
      }catch(error){
        const message=error instanceof Error?error.message:"Unknown sync error";
        failures.push(`${item.quoteId}: ${message}`);
        await markOutboxFailure(item.quoteId,message);
      }
    }
    return failures;
  })().finally(()=>{running=null});
  return running;
}
