import {
  getDB1,
  saveDB1
} from "../db/db1";

import {
  fetchDB1
} from "../api/appsScript";

import type {
  DB1
} from "../types/db1";

export async function syncDB1(): Promise<{
  config: DB1;
  updated: boolean;
}> {

  const local =
    await getDB1();

  try {

    const server =
      await fetchDB1() as DB1;

    if (!server || !Number.isFinite(server.versionId)) {
      throw new Error(
        "Invalid pricing configuration received from server"
      );
    }

    /*
     * First installation.
     */
    if (!local) {

      await saveDB1(server);

      return {
        config: server,
        updated: true
      };
    }

    /*
     * Server has newer configuration.
     */
    if (
      server.versionId >
      local.versionId
    ) {

      await saveDB1(server);

      return {
        config: server,
        updated: true
      };
    }

    /*
     * Local configuration is current.
     */
    return {
      config: local,
      updated: false
    };

  } catch (error) {

    /*
     * Offline / server unavailable.
     *
     * Continue using cached configuration
     * when available.
     */
    if (local) {

      console.warn(
        "Using cached DB1 because server is unavailable.",
        error
      );

      return {
        config: local,
        updated: false
      };
    }

    /*
     * First installation while offline.
     */
    throw new Error(
      "Unable to load pricing configuration. " +
      "Please connect to the internet for first-time setup."
    );
  }
}