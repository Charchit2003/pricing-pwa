import {
  useEffect,
  useState
} from "react";

import type {
  DB1
} from "./types/db1";

import {
  syncDB1
} from "./sync/configSync";

import {
  QuotePage
} from "./pages/Quote";

import{
  syncOutbox
} from "./sync/outboxSync";

import{
  PWAStatus
} from "./components/PWAStatus";

function App() {

  const [config, setConfig] =
    useState<DB1>();

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string>();

    useEffect(() => {

  syncOutbox();

  function handleOnline() {
    syncOutbox();
  }

  window.addEventListener(
    "online",
    handleOnline
  );

  return () => {
    window.removeEventListener(
      "online",
      handleOnline
    );
  };

}, []);

  useEffect(() => {

    syncDB1()
      .then(({ config }) => {
        setConfig(config);
      })
      .catch((error) => {

        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load configuration"
        );

      })
      .finally(() => {
        setLoading(false);
      });

  }, []);

  if (loading) {
    return (
      <div>
        Loading pricing configuration...
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2>
          Unable to start application
        </h2>

        <p>
          {error}
        </p>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <>

    <QuotePage
      config={config}
    />
    <PWAStatus />
        </>
  );
}

export default App;