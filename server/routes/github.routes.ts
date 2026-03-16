import { Router } from "express";
import { auth } from "../middleware/auth.middleware";
import * as GithubController from "../controller/github.controller";

const requestLog = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 15;

const githubRouteRateLimit = (req: any, res: any, next: any) => {
  const key = String(req.user?._id ?? req.ip ?? "anonymous");
  const now = Date.now();
  const recentRequests = (requestLog.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recentRequests.length >= MAX_REQUESTS) {
    return res.status(429).json({ success: 0, message: "Too many GitHub requests. Please try again shortly." });
  }

  recentRequests.push(now);
  requestLog.set(key, recentRequests);
  next();
};

const router = Router();

router.get("/connect", auth as any, githubRouteRateLimit as any, GithubController.connectGithub as any);
router.post("/connect", auth as any, githubRouteRateLimit as any, GithubController.connectGithub as any);
router.get("/callback", GithubController.githubCallback as any);
router.get("/profile", auth as any, githubRouteRateLimit as any, GithubController.getGithubProfile as any);
router.get("/repos", auth as any, githubRouteRateLimit as any, GithubController.getGithubRepos as any);
router.post("/analyze", auth as any, githubRouteRateLimit as any, GithubController.analyzeGithub as any);
router.get("/skills", auth as any, githubRouteRateLimit as any, GithubController.getGithubSkills as any);
router.get("/verify/:username/:skill", GithubController.getPublicVerification as any);

export default router;
