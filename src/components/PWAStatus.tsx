import { useRegisterSW } from "virtual:pwa-register/react";

export function PWAStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW();

  if (offlineReady) {
    return (
      <div className="pwa-notification">
        <span>App is ready to work offline.</span>

        <button onClick={() => setOfflineReady(false)}>
          OK
        </button>
      </div>
    );
  }

  if (needRefresh) {
    return (
      <div className="pwa-notification">
        <span>A new version of the app is available.</span>

        <button
          onClick={() => updateServiceWorker(true)}
        >
          Update
        </button>

        <button
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
      </div>
    );
  }

  return null;
}