import { getDatabase } from "./database";
import type { Quote, QuoteStatus } from "../types/db2";
export async function saveQuote(quote:Quote){const db=await getDatabase();const existing=await db.get("quotes",quote.id);if(existing?.status==="complete"&&JSON.stringify(existing)!==JSON.stringify(quote))throw new Error(`Completed quote ${quote.id} is immutable`);await db.put("quotes",quote);}
export async function getQuote(id:string){return (await getDatabase()).get("quotes",id);}
export async function getAllQuotes(){return (await getDatabase()).getAll("quotes");}
export async function getQuotesByStatus(status:QuoteStatus){return (await getDatabase()).getAllFromIndex("quotes","by-status",status);}
export async function deleteQuote(id:string){const db=await getDatabase();const q=await db.get("quotes",id);if(q?.status==="complete")throw new Error("Completed quotes cannot be deleted");await db.delete("quotes",id);}
