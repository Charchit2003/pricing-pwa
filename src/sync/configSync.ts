import { getDB1,saveDB1 } from "../db/db1";
import { fetchDB1 } from "../api/appsScript";
import { validateDB1 } from "../pricing/db1Validation";
import type { DB1 } from "../types/db1";
export async function syncDB1():Promise<{config:DB1;updated:boolean}>{const local=await getDB1();try{const server=validateDB1(await fetchDB1());if(!local||server.versionId>local.versionId){await saveDB1(server);return{config:server,updated:true}}return{config:local,updated:false}}catch(error){if(local)return{config:local,updated:false};throw new Error("Unable to load pricing configuration. Please connect to the internet for first-time setup.")}}
