import { GithubProfile } from "../../models/GithubProfile";
import { SkillProfile } from "../../models/SkillProfile";
import { Skill } from "../../models/skill.model";
import { SkillCheckSession } from "../../models/skill.check.session.model";
import { Judgement } from "../../models/judgement.model";
import {
  buildGithubAuthUrl,
  createOAuthState,
  decryptAccessToken,
  encryptAccessToken,
  exchangeCodeForAccessToken,
  verifyOAuthState,
} from "./githubAuth";
import { analyzeRepository } from "./repoAnalyzer";
import { buildSkillProfile } from "./skillDetector";

const SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REPOS_TO_ANALYZE = 20;
const MIN_GITHUB_REQUEST_GAP_MS = 180;
const requestSchedule = new Map<string, number>();

export type GithubRepoRecord = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  fork: boolean;
  stargazers_count: number;
  pushed_at: string;
  updated_at: string;
  default_branch: string;
  owner: {
    login: string;
  };
};

type GithubUser = {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  followers: number;
  public_repos: number;
};

type RepoDetails = {
  repository: GithubRepoRecord;
  languages: Record<string, number>;
  commitCount: number;
  analysis: ReturnType<typeof analyzeRepository>;
};

const normalizeSkill = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
const round = (value: number) => Math.round(value);

const ensureGithubRateLimit = async (token: string) => {
  const nextAllowedAt = requestSchedule.get(token) ?? 0;
  const waitMs = nextAllowedAt - Date.now();
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  requestSchedule.set(token, Date.now() + MIN_GITHUB_REQUEST_GAP_MS);
};

const githubFetch = async <T>(token: string, path: string): Promise<{ data: T; headers: Headers; status: number }> => {
  await ensureGithubRateLimit(token);
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Skillcraft-GitHub-Integration",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${errorText}`);
  }

  return {
    data: (await response.json()) as T,
    headers: response.headers,
    status: response.status,
  };
};

const githubFetchOptionalTextFile = async (token: string, path: string): Promise<string | null> => {
  await ensureGithubRateLimit(token);
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Skillcraft-GitHub-Integration",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) return null;

  const payload = (await response.json()) as { content?: string; encoding?: string; download_url?: string };
  if (payload.content && payload.encoding === "base64") {
    return Buffer.from(payload.content, "base64").toString("utf8");
  }
  if (payload.download_url) {
    const rawResponse = await fetch(payload.download_url, {
      headers: { "User-Agent": "Skillcraft-GitHub-Integration" },
    });
    if (rawResponse.ok) {
      return await rawResponse.text();
    }
  }
  return null;
};

const parseLastPage = (linkHeader: string | null) => {
  if (!linkHeader) return 1;
  const lastMatch = linkHeader.match(/&page=(\d+)>; rel="last"/);
  if (lastMatch) return Number(lastMatch[1]);
  const nextMatch = linkHeader.match(/&page=(\d+)>; rel="next"/);
  if (nextMatch) return Number(nextMatch[1]);
  return 1;
};

const fetchCommitCount = async (token: string, repository: GithubRepoRecord) => {
  try {
    const result = await githubFetch<unknown[]>(
      token,
      `/repos/${repository.owner.login}/${repository.name}/commits?per_page=1&sha=${repository.default_branch}`,
    );
    const lastPage = parseLastPage(result.headers.get("link"));
    return Array.isArray(result.data) && result.data.length === 0 ? 0 : lastPage;
  } catch (error) {
    return 0;
  }
};

const fetchRepositoryAnalysis = async (token: string, repository: GithubRepoRecord): Promise<RepoDetails> => {
  const [languagesResponse, packageJson, requirementsTxt, goMod, pomXml, commitCount] = await Promise.all([
    githubFetch<Record<string, number>>(token, `/repos/${repository.owner.login}/${repository.name}/languages`),
    githubFetchOptionalTextFile(token, `/repos/${repository.owner.login}/${repository.name}/contents/package.json`),
    githubFetchOptionalTextFile(token, `/repos/${repository.owner.login}/${repository.name}/contents/requirements.txt`),
    githubFetchOptionalTextFile(token, `/repos/${repository.owner.login}/${repository.name}/contents/go.mod`),
    githubFetchOptionalTextFile(token, `/repos/${repository.owner.login}/${repository.name}/contents/pom.xml`),
    fetchCommitCount(token, repository),
  ]);

  const analysis = analyzeRepository(
    {
      packageJson,
      requirementsTxt,
      goMod,
      pomXml,
    },
    languagesResponse.data,
  );

  return {
    repository,
    languages: languagesResponse.data,
    commitCount,
    analysis,
  };
};

const aggregateUnique = (values: string[][]) => Array.from(new Set(values.flat())).sort((left, right) => left.localeCompare(right));

const buildVoiceScores = async (userId: string) => {
  const sessions = await SkillCheckSession.find({ userId }).select("_id skillName").lean();
  const sessionIds = sessions.map((session) => session._id);
  const judgements = await Judgement.find({ sessionId: { $in: sessionIds } }).select("sessionId clarity correctness depth delivery").lean();

  const sessionLookup = new Map(sessions.map((session) => [String(session._id), session.skillName]));
  const scoreGroups = new Map<string, number[]>();

  for (const judgement of judgements) {
    const skillName = sessionLookup.get(String(judgement.sessionId));
    if (!skillName) continue;
    const scores = [judgement.clarity ?? 0, judgement.correctness ?? 0, judgement.depth ?? 0];
    if (typeof judgement.delivery === "number") scores.push(judgement.delivery);
    const averageOutOfTen = scores.reduce((total, score) => total + score, 0) / scores.length;
    const normalizedSkillName = normalizeSkill(skillName);
    const existing = scoreGroups.get(normalizedSkillName) ?? [];
    existing.push(averageOutOfTen * 10);
    scoreGroups.set(normalizedSkillName, existing);
  }

  return Array.from(scoreGroups.entries()).map(([skill, values]) => ({
    skill,
    voiceScore: round(values.reduce((total, value) => total + value, 0) / values.length),
  }));
};

const sanitizeGithubProfile = (profile: any) => {
  if (!profile) return null;
  return {
    githubId: profile.githubId,
    username: profile.username,
    avatar: profile.avatar,
    profileUrl: profile.profileUrl,
    followers: profile.followers ?? 0,
    publicRepos: profile.publicRepos ?? 0,
    reposAnalyzed: profile.reposAnalyzed ?? 0,
    lastSync: profile.lastSync,
    repoSnapshots: profile.repoSnapshots ?? [],
  };
};

const sanitizeSkillProfile = (profile: any, username?: string) => {
  if (!profile) return null;
  return {
    languages: profile.languages ?? [],
    frameworks: profile.frameworks ?? [],
    libraries: profile.libraries ?? [],
    repoCount: profile.repoCount ?? 0,
    commitCount: profile.commitCount ?? 0,
    primaryStack: profile.primaryStack ?? [],
    skillsDetected: (profile.skillsDetected ?? []).map((skill: any) => ({
      ...skill,
      verificationUrl: username ? `/verify/${username}/${encodeURIComponent(String(skill.skill).toLowerCase())}` : null,
    })),
    confidenceScore: profile.confidenceScore ?? 0,
    combinedSummary: profile.combinedSummary ?? { githubScore: 0, voiceScore: 0, finalScore: 0 },
    repoHighlights: profile.repoHighlights ?? [],
    updatedAt: profile.updatedAt,
  };
};

export const createGithubConnection = (userId: string) => {
  const state = createOAuthState(userId);
  const url = buildGithubAuthUrl(state);
  return { url, state };
};

export const handleGithubCallback = async (code: string, state: string) => {
  const { userId } = verifyOAuthState(state);
  const accessToken = await exchangeCodeForAccessToken(code);
  const githubUserResponse = await githubFetch<GithubUser>(accessToken, "/user");
  const encrypted = encryptAccessToken(accessToken);

  const githubProfile = await GithubProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        githubId: String(githubUserResponse.data.id),
        username: githubUserResponse.data.login,
        avatar: githubUserResponse.data.avatar_url,
        profileUrl: githubUserResponse.data.html_url,
        followers: githubUserResponse.data.followers,
        publicRepos: githubUserResponse.data.public_repos,
        ...encrypted,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return {
    userId,
    githubProfile: sanitizeGithubProfile(githubProfile),
  };
};

export const getGithubProfileByUserId = async (userId: string) => {
  const githubProfile = await GithubProfile.findOne({ userId }).lean();
  const skillProfile = await SkillProfile.findOne({ userId }).lean();

  return {
    githubProfile: sanitizeGithubProfile(githubProfile),
    skillProfile: sanitizeSkillProfile(skillProfile, githubProfile?.username),
    connected: Boolean(githubProfile),
  };
};

export const getGithubReposByUserId = async (userId: string) => {
  const githubProfile = await GithubProfile.findOne({ userId }).lean();
  if (!githubProfile) {
    throw new Error("GitHub account not connected");
  }

  return githubProfile.repoSnapshots ?? [];
};

export const analyzeGithubProfile = async (userId: string, forceRefresh = false) => {
  const githubProfile = await GithubProfile.findOne({ userId });
  if (!githubProfile) {
    throw new Error("GitHub account not connected");
  }

  if (!forceRefresh && githubProfile.lastSync && Date.now() - new Date(githubProfile.lastSync).getTime() < SYNC_WINDOW_MS) {
    const skillProfile = await SkillProfile.findOne({ userId }).lean();
    return {
      githubProfile: sanitizeGithubProfile(githubProfile.toObject()),
      skillProfile: sanitizeSkillProfile(skillProfile, githubProfile.username),
      cached: true,
    };
  }

  let token = "";
  try {
    token = decryptAccessToken(githubProfile.accessToken, githubProfile.tokenIv, githubProfile.tokenTag);
  } catch {
    throw new Error("Stored GitHub token could not be decrypted. Please reconnect your GitHub account.");
  }
  const repositoryResponse = await githubFetch<GithubRepoRecord[]>(token, "/user/repos?sort=updated&per_page=100&type=owner");
  const repositories = repositoryResponse.data
    .filter((repository) => !repository.fork)
    .sort((left, right) => new Date(right.pushed_at).getTime() - new Date(left.pushed_at).getTime())
    .slice(0, MAX_REPOS_TO_ANALYZE);

  const repoDetails: RepoDetails[] = [];
  for (const repository of repositories) {
    repoDetails.push(await fetchRepositoryAnalysis(token, repository));
  }

  const aggregateTechnologies = {
    languages: aggregateUnique(repoDetails.map((detail) => detail.analysis.languages)),
    frameworks: aggregateUnique(repoDetails.map((detail) => detail.analysis.frameworks)),
    libraries: aggregateUnique(repoDetails.map((detail) => detail.analysis.libraries)),
  };

  const voiceScores = await buildVoiceScores(userId);
  const computedProfile = buildSkillProfile(
    repoDetails.map((detail) => ({
      name: detail.repository.name,
      commits: detail.commitCount,
      skills: detail.analysis.skills,
      dependencyMatches: detail.analysis.dependencyMatches,
      technologies: detail.analysis.technologies,
    })),
    voiceScores,
    aggregateTechnologies,
  );

  const repoSnapshots = repoDetails.map((detail) => ({
    name: detail.repository.name,
    fullName: detail.repository.full_name,
    htmlUrl: detail.repository.html_url,
    description: detail.repository.description ?? "",
    languages: detail.analysis.languages,
    frameworks: detail.analysis.frameworks,
    libraries: detail.analysis.libraries,
    verifiedSkills: detail.analysis.skills,
    commits: detail.commitCount,
    stargazers: detail.repository.stargazers_count,
    updatedAt: detail.repository.updated_at,
  }));

  githubProfile.reposAnalyzed = repositories.length;
  githubProfile.repoSnapshots = repoSnapshots as any;
  githubProfile.lastSync = new Date();
  await githubProfile.save();

  const repoHighlights = repoDetails.slice(0, 6).map((detail) => ({
    name: detail.repository.name,
    url: detail.repository.html_url,
    summary: detail.repository.description ?? "Repository analyzed for SkillCraft verification.",
    technologies: detail.analysis.technologies.slice(0, 6),
    commits: detail.commitCount,
    stars: detail.repository.stargazers_count,
  }));

  const skillProfile = await SkillProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...computedProfile,
        repoHighlights,
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return {
    githubProfile: sanitizeGithubProfile(githubProfile.toObject()),
    skillProfile: sanitizeSkillProfile(skillProfile, githubProfile.username),
    cached: false,
  };
};

export const getGithubSkillsByUserId = async (userId: string) => {
  const githubProfile = await GithubProfile.findOne({ userId }).lean();
  const skillProfile = await SkillProfile.findOne({ userId }).lean();
  if (!githubProfile || !skillProfile) {
    throw new Error("GitHub skills not available");
  }
  return sanitizeSkillProfile(skillProfile, githubProfile.username);
};

const findSkillEntry = (skills: any[], requestedSkill: string) => {
  const normalizedRequested = normalizeSkill(requestedSkill);
  return skills.find((skill) => normalizeSkill(skill.skill) === normalizedRequested || normalizeSkill(skill.skill).includes(normalizedRequested));
};

export const getPublicVerification = async (username: string, skill: string) => {
  const githubProfile = await GithubProfile.findOne({ username: new RegExp(`^${username}$`, "i") }).lean();
  if (!githubProfile) {
    throw new Error("Verification profile not found");
  }

  const skillProfile = await SkillProfile.findOne({ userId: githubProfile.userId }).lean();
  if (!skillProfile) {
    throw new Error("Verification profile not found");
  }

  const skillEntry = findSkillEntry(skillProfile.skillsDetected ?? [], skill);
  if (!skillEntry) {
    throw new Error("Requested skill verification not found");
  }

  const canonicalSkill = await Skill.findOne({ name: new RegExp(`^${skillEntry.skill}$`, "i") }).lean();

  const relatedRepositories = (skillProfile.repoHighlights ?? []).filter((repository: any) =>
    (repository.technologies ?? []).some((technology: string) => normalizeSkill(technology) === normalizeSkill(skillEntry.skill)),
  );

  const conceptCoverage = {
    codeEvidence: Math.min(100, skillEntry.codeScore),
    explanationStrength: Math.min(100, skillEntry.voiceScore ?? 0),
    finalVerification: Math.min(100, skillEntry.finalScore ?? skillEntry.score),
  };

  return {
    profile: {
      username: githubProfile.username,
      avatar: githubProfile.avatar,
      profileUrl: githubProfile.profileUrl,
    },
    skill: {
      id: canonicalSkill?._id,
      name: skillEntry.skill,
      codeScore: skillEntry.codeScore,
      voiceScore: skillEntry.voiceScore,
      finalScore: skillEntry.finalScore,
      verified: skillEntry.verified,
      confidenceScore: skillProfile.confidenceScore,
    },
    stack: {
      languages: skillProfile.languages ?? [],
      frameworks: skillProfile.frameworks ?? [],
      libraries: skillProfile.libraries ?? [],
      primaryStack: skillProfile.primaryStack ?? [],
    },
    conceptCoverage,
    repositories: relatedRepositories,
    summary: skillProfile.combinedSummary ?? { githubScore: 0, voiceScore: 0, finalScore: 0 },
    updatedAt: skillProfile.updatedAt,
  };
};

export const syncStaleGithubProfiles = async () => {
  const staleProfiles = await GithubProfile.find({
    $or: [
      { lastSync: { $exists: false } },
      { lastSync: { $lt: new Date(Date.now() - SYNC_WINDOW_MS) } },
    ],
  }).select("userId").lean();

  for (const profile of staleProfiles) {
    try {
      await analyzeGithubProfile(String(profile.userId), true);
    } catch (error) {
      console.error("GitHub sync job failed for user", String(profile.userId), error);
    }
  }
};
