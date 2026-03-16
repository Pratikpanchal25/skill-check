"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const GithubController = __importStar(require("../controller/github.controller"));
const requestLog = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 15;
const githubRouteRateLimit = (req, res, next) => {
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
const router = (0, express_1.Router)();
router.get("/connect", auth_middleware_1.auth, githubRouteRateLimit, GithubController.connectGithub);
router.post("/connect", auth_middleware_1.auth, githubRouteRateLimit, GithubController.connectGithub);
router.get("/callback", GithubController.githubCallback);
router.get("/profile", auth_middleware_1.auth, githubRouteRateLimit, GithubController.getGithubProfile);
router.get("/repos", auth_middleware_1.auth, githubRouteRateLimit, GithubController.getGithubRepos);
router.post("/analyze", auth_middleware_1.auth, githubRouteRateLimit, GithubController.analyzeGithub);
router.get("/skills", auth_middleware_1.auth, githubRouteRateLimit, GithubController.getGithubSkills);
router.get("/verify/:username/:skill", GithubController.getPublicVerification);
exports.default = router;
