import { getDatabase } from "./database";
import type { Quote } from "../types/db2";
export interface OutboxItem{quoteId:string;payload:Quote;retryCount:number;createdAt:string;lastAttemptAt?:string;lastError?:string}
export async function addToOutbox(quote:Quote){if(quote.status!=="pending")throw new Error("Only pending quotes can enter the outbox");const db=await getDatabase();const old=await db.get("outbox",quote.id);await db.put("outbox",{quoteId:quote.id,payload:structuredClone(quote),retryCount:old?.retryCount??0,createdAt:old?.createdAt??new Date().toISOString()});}
export async function getOutboxItems(){return(await getDatabase()).getAll("outbox")}
export async function removeFromOutbox(id:string){await(await getDatabase()).delete("outbox",id)}
export async function markOutboxFailure(id:string,error:string){const db=await getDatabase();const old=await db.get("outbox",id);if(!old)return;await db.put("outbox",{...old,retryCount:old.retryCount+1,lastAttemptAt:new Date().toISOString(),lastError:error})}
