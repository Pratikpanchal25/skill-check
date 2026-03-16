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
exports.connectGithub = connectGithub;
exports.githubCallback = githubCallback;
exports.getGithubProfile = getGithubProfile;
exports.getGithubRepos = getGithubRepos;
exports.analyzeGithub = analyzeGithub;
exports.getGithubSkills = getGithubSkills;
exports.getPublicVerification = getPublicVerification;
const index_1 = require("../utils/index");
const GithubService = __importStar(require("../integrations/github/githubService"));
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";
async function connectGithub(req, res) {
    try {
        if (!req.user?._id) {
            (0, index_1.errorResponseWithStatusCode)(res, "Unauthorized", 401);
            return;
        }
        const payload = GithubService.createGithubConnection(String(req.user._id));
        if (req.method === "GET" && req.query.redirect === "1") {
            res.redirect(payload.url);
            return;
        }
        (0, index_1.successResponse)(res, { success: true, ...payload }, "GitHub connection URL created successfully");
        return;
    }
    catch (error) {
        (0, index_1.catchResponse)(res, error, "Failed to start GitHub connection");
        return;
    }
}
async function githubCallback(req, res) {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || !state) {
        res.redirect(`${frontendUrl}/dashboard/github-verification?github=error`);
        return;
    }
    try {
        await GithubService.handleGithubCallback(code, state);
        res.redirect(`${frontendUrl}/dashboard/github-verification?github=connected`);
    }
    catch (error) {
        console.error("GitHub callback failed", error);
        res.redirect(`${frontendUrl}/dashboard/github-verification?github=error`);
    }
}
async function getGithubProfile(req, res) {
    try {
        if (!req.user?._id) {
            (0, index_1.errorResponseWithStatusCode)(res, "Unauthorized", 401);
            return;
        }
        const profile = await GithubService.getGithubProfileByUserId(String(req.user._id));
        (0, index_1.successResponse)(res, { success: true, ...profile }, "GitHub profile retrieved successfully");
        return;
    }
    catch (error) {
        (0, index_1.catchResponse)(res, error, "Failed to retrieve GitHub profile");
        return;
    }
}
async function getGithubRepos(req, res) {
    try {
        if (!req.user?._id) {
            (0, index_1.errorResponseWithStatusCode)(res, "Unauthorized", 401);
            return;
        }
        const repos = await GithubService.getGithubReposByUserId(String(req.user._id));
        (0, index_1.successResponse)(res, { success: true, repos }, "GitHub repositories retrieved successfully");
        return;
    }
    catch (error) {
        (0, index_1.catchResponse)(res, error, "Failed to retrieve GitHub repositories");
        return;
    }
}
async function analyzeGithub(req, res) {
    try {
        if (!req.user?._id) {
            (0, index_1.errorResponseWithStatusCode)(res, "Unauthorized", 401);
            return;
        }
        const forceRefresh = Boolean(req.body?.forceRefresh);
        const analysis = await GithubService.analyzeGithubProfile(String(req.user._id), forceRefresh);
        (0, index_1.successResponse)(res, { success: true, ...analysis }, "GitHub repositories analyzed successfully");
        return;
    }
    catch (error) {
        (0, index_1.catchResponse)(res, error, "Failed to analyze GitHub repositories");
        return;
    }
}
async function getGithubSkills(req, res) {
    try {
        if (!req.user?._id) {
            (0, index_1.errorResponseWithStatusCode)(res, "Unauthorized", 401);
            return;
        }
        const skillProfile = await GithubService.getGithubSkillsByUserId(String(req.user._id));
        (0, index_1.successResponse)(res, { success: true, skillProfile }, "GitHub skills retrieved successfully");
        return;
    }
    catch (error) {
        (0, index_1.catchResponse)(res, error, "Failed to retrieve GitHub skills");
        return;
    }
}
async function getPublicVerification(req, res) {
    try {
        const username = String(req.params.username ?? "");
        const skill = String(req.params.skill ?? "");
        if (!username || !skill) {
            (0, index_1.errorResponseWithStatusCode)(res, "Username and skill are required", 400);
            return;
        }
        const verification = await GithubService.getPublicVerification(username, skill);
        (0, index_1.successResponse)(res, { success: true, verification }, "Verification profile retrieved successfully");
        return;
    }
    catch (error) {
        (0, index_1.catchResponse)(res, error, "Failed to retrieve verification profile");
        return;
    }
}
