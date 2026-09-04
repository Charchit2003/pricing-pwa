import { syncOutbox } from "./outboxSync";

export function registerConnectivitySync(): void {
  window.addEventListener("online", () => {
    void syncOutbox();
  });

  if (navigator.onLine) {
    void syncOutbox();
  }
}