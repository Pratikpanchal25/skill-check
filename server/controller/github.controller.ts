import { Request } from "express";
import { AuthRequest, CombinedResponseType } from "../types/index";
import { catchResponse, errorResponseWithStatusCode, successResponse } from "../utils/index";
import * as GithubService from "../integrations/github/githubService";

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

export async function connectGithub(req: AuthRequest, res: CombinedResponseType): Promise<void> {
  try {
    if (!req.user?._id) {
      errorResponseWithStatusCode(res, "Unauthorized", 401);
      return;
    }

    const payload = GithubService.createGithubConnection(String(req.user._id));

    if (req.method === "GET" && req.query.redirect === "1") {
      res.redirect(payload.url);
      return;
    }

    successResponse(res, { success: true, ...payload }, "GitHub connection URL created successfully");
    return;
  } catch (error) {
    catchResponse(res, error, "Failed to start GitHub connection");
    return;
  }
}

export async function githubCallback(req: Request, res: any): Promise<void> {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  if (!code || !state) {
    res.redirect(`${frontendUrl}/dashboard/github-verification?github=error`);
    return;
  }

  try {
    await GithubService.handleGithubCallback(code, state);
    res.redirect(`${frontendUrl}/dashboard/github-verification?github=connected`);
  } catch (error) {
    console.error("GitHub callback failed", error);
    res.redirect(`${frontendUrl}/dashboard/github-verification?github=error`);
  }
}

export async function getGithubProfile(req: AuthRequest, res: CombinedResponseType): Promise<void> {
  try {
    if (!req.user?._id) {
      errorResponseWithStatusCode(res, "Unauthorized", 401);
      return;
    }

    const profile = await GithubService.getGithubProfileByUserId(String(req.user._id));
    successResponse(res, { success: true, ...profile }, "GitHub profile retrieved successfully");
    return;
  } catch (error) {
    catchResponse(res, error, "Failed to retrieve GitHub profile");
    return;
  }
}

export async function getGithubRepos(req: AuthRequest, res: CombinedResponseType): Promise<void> {
  try {
    if (!req.user?._id) {
      errorResponseWithStatusCode(res, "Unauthorized", 401);
      return;
    }

    const repos = await GithubService.getGithubReposByUserId(String(req.user._id));
    successResponse(res, { success: true, repos }, "GitHub repositories retrieved successfully");
    return;
  } catch (error) {
    catchResponse(res, error, "Failed to retrieve GitHub repositories");
    return;
  }
}

export async function analyzeGithub(req: AuthRequest, res: CombinedResponseType): Promise<void> {
  try {
    if (!req.user?._id) {
      errorResponseWithStatusCode(res, "Unauthorized", 401);
      return;
    }

    const forceRefresh = Boolean(req.body?.forceRefresh);
    const analysis = await GithubService.analyzeGithubProfile(String(req.user._id), forceRefresh);
    successResponse(res, { success: true, ...analysis }, "GitHub repositories analyzed successfully");
    return;
  } catch (error) {
    catchResponse(res, error, "Failed to analyze GitHub repositories");
    return;
  }
}

export async function getGithubSkills(req: AuthRequest, res: CombinedResponseType): Promise<void> {
  try {
    if (!req.user?._id) {
      errorResponseWithStatusCode(res, "Unauthorized", 401);
      return;
    }

    const skillProfile = await GithubService.getGithubSkillsByUserId(String(req.user._id));
    successResponse(res, { success: true, skillProfile }, "GitHub skills retrieved successfully");
    return;
  } catch (error) {
    catchResponse(res, error, "Failed to retrieve GitHub skills");
    return;
  }
}

export async function getPublicVerification(req: Request, res: CombinedResponseType): Promise<void> {
  try {
    const username = String(req.params.username ?? "");
    const skill = String(req.params.skill ?? "");

    if (!username || !skill) {
      errorResponseWithStatusCode(res, "Username and skill are required", 400);
      return;
    }

    const verification = await GithubService.getPublicVerification(username, skill);
    successResponse(res, { success: true, verification }, "Verification profile retrieved successfully");
    return;
  } catch (error) {
    catchResponse(res, error, "Failed to retrieve verification profile");
    return;
  }
}
