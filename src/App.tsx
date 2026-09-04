import { useEffect,useState } from "react";
import type { DB1 } from "./types/db1";
import type { Quote } from "./types/db2";
import { syncDB1 } from "./sync/configSync";
import { syncOutbox } from "./sync/outboxSync";
import { Dashboard } from "./pages/Dashboard";
import { QuotePage } from "./pages/Quote";
import { PWAStatus } from "./components/PWAStatus";
export default function App(){const[config,setConfig]=useState<DB1>();const[openQuote,setOpenQuote]=useState<Quote|"new"|null>(null);const[loading,setLoading]=useState(true);const[error,setError]=useState("");useEffect(()=>{void syncDB1().then(({config})=>setConfig(config)).catch(e=>setError(e instanceof Error?e.message:"Unable to load configuration")).finally(()=>setLoading(false));},[]);useEffect(()=>{const sync=()=>void syncOutbox();window.addEventListener("online",sync);if(navigator.onLine)sync();return()=>window.removeEventListener("online",sync);},[]);if(loading)return <div className="app-loading">Loading pricing configuration...</div>;if(error)return <div className="app-error"><h2>Unable to start application</h2><p>{error}</p></div>;if(!config)return null;return <><PWAStatus />{openQuote?<QuotePage config={config} initialQuote={openQuote==="new"?null:openQuote} onBack={()=>setOpenQuote(null)}/>:<Dashboard onNewQuote={()=>setOpenQuote("new")} onOpenQuote={q=>setOpenQuote(q)}/>} </>}
