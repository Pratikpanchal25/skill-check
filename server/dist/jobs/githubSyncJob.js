"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGithubSyncJob = void 0;
const githubService_1 = require("../integrations/github/githubService");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
let syncInterval = null;
const startGithubSyncJob = () => {
    if (syncInterval)
        return;
    syncInterval = setInterval(() => {
        (0, githubService_1.syncStaleGithubProfiles)().catch((error) => {
            console.error("Scheduled GitHub sync failed", error);
        });
    }, ONE_DAY_MS);
};
exports.startGithubSyncJob = startGithubSyncJob;
