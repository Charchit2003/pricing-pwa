import { syncOutbox } from "./outboxSync";
let registered=false;
export function registerConnectivitySync(){if(registered)return;registered=true;window.addEventListener("online",()=>void syncOutbox());if(navigator.onLine)void syncOutbox();}
