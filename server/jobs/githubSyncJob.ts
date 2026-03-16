import { syncStaleGithubProfiles } from "../integrations/github/githubService";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let syncInterval: NodeJS.Timeout | null = null;

export const startGithubSyncJob = () => {
  if (syncInterval) return;

  syncInterval = setInterval(() => {
    syncStaleGithubProfiles().catch((error) => {
      console.error("Scheduled GitHub sync failed", error);
    });
  }, ONE_DAY_MS);
};
