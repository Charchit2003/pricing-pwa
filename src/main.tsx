import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerConnectivitySync } from './sync/startupSync.ts';
import { registerServiceWorker } from './registerSW.ts';

registerConnectivitySync();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
