"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncStaleGithubProfiles = exports.getPublicVerification = exports.getGithubSkillsByUserId = exports.analyzeGithubProfile = exports.getGithubReposByUserId = exports.getGithubProfileByUserId = exports.handleGithubCallback = exports.createGithubConnection = void 0;
const GithubProfile_1 = require("../../models/GithubProfile");
const SkillProfile_1 = require("../../models/SkillProfile");
const skill_check_session_model_1 = require("../../models/skill.check.session.model");
const judgement_model_1 = require("../../models/judgement.model");
const githubAuth_1 = require("./githubAuth");
const repoAnalyzer_1 = require("./repoAnalyzer");
const skillDetector_1 = require("./skillDetector");
const SYNC_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REPOS_TO_ANALYZE = 20;
const MIN_GITHUB_REQUEST_GAP_MS = 180;
const requestSchedule = new Map();
const normalizeSkill = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
const round = (value) => Math.round(value);
const ensureGithubRateLimit = async (token) => {
    const nextAllowedAt = requestSchedule.get(token) ?? 0;
    const waitMs = nextAllowedAt - Date.now();
    if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    requestSchedule.set(token, Date.now() + MIN_GITHUB_REQUEST_GAP_MS);
};
const githubFetch = async (token, path) => {
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
        data: (await response.json()),
        headers: response.headers,
        status: response.status,
    };
};
const githubFetchOptionalTextFile = async (token, path) => {
    await ensureGithubRateLimit(token);
    const response = await fetch(`https://api.github.com${path}`, {
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Skillcraft-GitHub-Integration",
        },
    });
    if (response.status === 404)
        return null;
    if (!response.ok)
        return null;
    const payload = (await response.json());
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
const parseLastPage = (linkHeader) => {
    if (!linkHeader)
        return 1;
    const lastMatch = linkHeader.match(/&page=(\d+)>; rel="last"/);
    if (lastMatch)
        return Number(lastMatch[1]);
    const nextMatch = linkHeader.match(/&page=(\d+)>; rel="next"/);
    if (nextMatch)
        return Number(nextMatch[1]);
    return 1;
};
const fetchCommitCount = async (token, repository) => {
    try {
        const result = await githubFetch(token, `/repos/${repository.owner.login}/${repository.name}/commits?per_page=1&sha=${repository.default_branch}`);
        const lastPage = parseLastPage(result.headers.get("link"));
        return Array.isArray(result.data) && result.data.length === 0 ? 0 : lastPage;
    }
    catch (error) {
        return 0;
    }
};
const fetchRepositoryAnalysis = async (token, repository) => {
    const [languagesResponse, packageJson, requirementsTxt, goMod, pomXml, commitCount] = await Promise.all([
        githubFetch(token, `/repos/${repository.owner.login}/${repository.name}/languages`),
        githubFetchOptionalTextFile(token, `/repos/${repository.owner.login}/${repository.name}/contents/package.json`),
        githubFetchOptionalTextFile(token, `/repos/${repository.owner.login}/${repository.name}/contents/requirements.txt`),
        githubFetchOptionalTextFile(token, `/repos/${repository.owner.login}/${repository.name}/contents/go.mod`),
        githubFetchOptionalTextFile(token, `/repos/${repository.owner.login}/${repository.name}/contents/pom.xml`),
        fetchCommitCount(token, repository),
    ]);
    const analysis = (0, repoAnalyzer_1.analyzeRepository)({
        packageJson,
        requirementsTxt,
        goMod,
        pomXml,
    }, languagesResponse.data);
    return {
        repository,
        languages: languagesResponse.data,
        commitCount,
        analysis,
    };
};
const aggregateUnique = (values) => Array.from(new Set(values.flat())).sort((left, right) => left.localeCompare(right));
const buildVoiceScores = async (userId) => {
    const sessions = await skill_check_session_model_1.SkillCheckSession.find({ userId }).select("_id skillName").lean();
    const sessionIds = sessions.map((session) => session._id);
    const judgements = await judgement_model_1.Judgement.find({ sessionId: { $in: sessionIds } }).select("sessionId clarity correctness depth delivery").lean();
    const sessionLookup = new Map(sessions.map((session) => [String(session._id), session.skillName]));
    const scoreGroups = new Map();
    for (const judgement of judgements) {
        const skillName = sessionLookup.get(String(judgement.sessionId));
        if (!skillName)
            continue;
        const scores = [judgement.clarity ?? 0, judgement.correctness ?? 0, judgement.depth ?? 0];
        if (typeof judgement.delivery === "number")
            scores.push(judgement.delivery);
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
const sanitizeGithubProfile = (profile) => {
    if (!profile)
        return null;
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
const sanitizeSkillProfile = (profile, username) => {
    if (!profile)
        return null;
    return {
        languages: profile.languages ?? [],
        frameworks: profile.frameworks ?? [],
        libraries: profile.libraries ?? [],
        repoCount: profile.repoCount ?? 0,
        commitCount: profile.commitCount ?? 0,
        primaryStack: profile.primaryStack ?? [],
        skillsDetected: (profile.skillsDetected ?? []).map((skill) => ({
            ...skill,
            verificationUrl: username ? `/verify/${username}/${encodeURIComponent(String(skill.skill).toLowerCase())}` : null,
        })),
        confidenceScore: profile.confidenceScore ?? 0,
        combinedSummary: profile.combinedSummary ?? { githubScore: 0, voiceScore: 0, finalScore: 0 },
        repoHighlights: profile.repoHighlights ?? [],
        updatedAt: profile.updatedAt,
    };
};
const createGithubConnection = (userId) => {
    const state = (0, githubAuth_1.createOAuthState)(userId);
    const url = (0, githubAuth_1.buildGithubAuthUrl)(state);
    return { url, state };
};
exports.createGithubConnection = createGithubConnection;
const handleGithubCallback = async (code, state) => {
    const { userId } = (0, githubAuth_1.verifyOAuthState)(state);
    const accessToken = await (0, githubAuth_1.exchangeCodeForAccessToken)(code);
    const githubUserResponse = await githubFetch(accessToken, "/user");
    const encrypted = (0, githubAuth_1.encryptAccessToken)(accessToken);
    const githubProfile = await GithubProfile_1.GithubProfile.findOneAndUpdate({ userId }, {
        $set: {
            githubId: String(githubUserResponse.data.id),
            username: githubUserResponse.data.login,
            avatar: githubUserResponse.data.avatar_url,
            profileUrl: githubUserResponse.data.html_url,
            followers: githubUserResponse.data.followers,
            publicRepos: githubUserResponse.data.public_repos,
            ...encrypted,
        },
    }, { new: true, upsert: true, setDefaultsOnInsert: true });
    return {
        userId,
        githubProfile: sanitizeGithubProfile(githubProfile),
    };
};
exports.handleGithubCallback = handleGithubCallback;
const getGithubProfileByUserId = async (userId) => {
    const githubProfile = await GithubProfile_1.GithubProfile.findOne({ userId }).lean();
    const skillProfile = await SkillProfile_1.SkillProfile.findOne({ userId }).lean();
    return {
        githubProfile: sanitizeGithubProfile(githubProfile),
        skillProfile: sanitizeSkillProfile(skillProfile, githubProfile?.username),
        connected: Boolean(githubProfile),
    };
};
exports.getGithubProfileByUserId = getGithubProfileByUserId;
const getGithubReposByUserId = async (userId) => {
    const githubProfile = await GithubProfile_1.GithubProfile.findOne({ userId }).lean();
    if (!githubProfile) {
        throw new Error("GitHub account not connected");
    }
    return githubProfile.repoSnapshots ?? [];
};
exports.getGithubReposByUserId = getGithubReposByUserId;
const analyzeGithubProfile = async (userId, forceRefresh = false) => {
    const githubProfile = await GithubProfile_1.GithubProfile.findOne({ userId });
    if (!githubProfile) {
        throw new Error("GitHub account not connected");
    }
    if (!forceRefresh && githubProfile.lastSync && Date.now() - new Date(githubProfile.lastSync).getTime() < SYNC_WINDOW_MS) {
        const skillProfile = await SkillProfile_1.SkillProfile.findOne({ userId }).lean();
        return {
            githubProfile: sanitizeGithubProfile(githubProfile.toObject()),
            skillProfile: sanitizeSkillProfile(skillProfile, githubProfile.username),
            cached: true,
        };
    }
    let token = "";
    try {
        token = (0, githubAuth_1.decryptAccessToken)(githubProfile.accessToken, githubProfile.tokenIv, githubProfile.tokenTag);
    }
    catch {
        throw new Error("Stored GitHub token could not be decrypted. Please reconnect your GitHub account.");
    }
    const repositoryResponse = await githubFetch(token, "/user/repos?sort=updated&per_page=100&type=owner");
    const repositories = repositoryResponse.data
        .filter((repository) => !repository.fork)
        .sort((left, right) => new Date(right.pushed_at).getTime() - new Date(left.pushed_at).getTime())
        .slice(0, MAX_REPOS_TO_ANALYZE);
    const repoDetails = [];
    for (const repository of repositories) {
        repoDetails.push(await fetchRepositoryAnalysis(token, repository));
    }
    const aggregateTechnologies = {
        languages: aggregateUnique(repoDetails.map((detail) => detail.analysis.languages)),
        frameworks: aggregateUnique(repoDetails.map((detail) => detail.analysis.frameworks)),
        libraries: aggregateUnique(repoDetails.map((detail) => detail.analysis.libraries)),
    };
    const voiceScores = await buildVoiceScores(userId);
    const computedProfile = (0, skillDetector_1.buildSkillProfile)(repoDetails.map((detail) => ({
        name: detail.repository.name,
        commits: detail.commitCount,
        skills: detail.analysis.skills,
        dependencyMatches: detail.analysis.dependencyMatches,
        technologies: detail.analysis.technologies,
    })), voiceScores, aggregateTechnologies);
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
    githubProfile.repoSnapshots = repoSnapshots;
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
    const skillProfile = await SkillProfile_1.SkillProfile.findOneAndUpdate({ userId }, {
        $set: {
            ...computedProfile,
            repoHighlights,
            updatedAt: new Date(),
        },
    }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
    return {
        githubProfile: sanitizeGithubProfile(githubProfile.toObject()),
        skillProfile: sanitizeSkillProfile(skillProfile, githubProfile.username),
        cached: false,
    };
};
exports.analyzeGithubProfile = analyzeGithubProfile;
const getGithubSkillsByUserId = async (userId) => {
    const githubProfile = await GithubProfile_1.GithubProfile.findOne({ userId }).lean();
    const skillProfile = await SkillProfile_1.SkillProfile.findOne({ userId }).lean();
    if (!githubProfile || !skillProfile) {
        throw new Error("GitHub skills not available");
    }
    return sanitizeSkillProfile(skillProfile, githubProfile.username);
};
exports.getGithubSkillsByUserId = getGithubSkillsByUserId;
const findSkillEntry = (skills, requestedSkill) => {
    const normalizedRequested = normalizeSkill(requestedSkill);
    return skills.find((skill) => normalizeSkill(skill.skill) === normalizedRequested || normalizeSkill(skill.skill).includes(normalizedRequested));
};
const getPublicVerification = async (username, skill) => {
    const githubProfile = await GithubProfile_1.GithubProfile.findOne({ username: new RegExp(`^${username}$`, "i") }).lean();
    if (!githubProfile) {
        throw new Error("Verification profile not found");
    }
    const skillProfile = await SkillProfile_1.SkillProfile.findOne({ userId: githubProfile.userId }).lean();
    if (!skillProfile) {
        throw new Error("Verification profile not found");
    }
    const skillEntry = findSkillEntry(skillProfile.skillsDetected ?? [], skill);
    if (!skillEntry) {
        throw new Error("Requested skill verification not found");
    }
    const relatedRepositories = (skillProfile.repoHighlights ?? []).filter((repository) => (repository.technologies ?? []).some((technology) => normalizeSkill(technology) === normalizeSkill(skillEntry.skill)));
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
exports.getPublicVerification = getPublicVerification;
const syncStaleGithubProfiles = async () => {
    const staleProfiles = await GithubProfile_1.GithubProfile.find({
        $or: [
            { lastSync: { $exists: false } },
            { lastSync: { $lt: new Date(Date.now() - SYNC_WINDOW_MS) } },
        ],
    }).select("userId").lean();
    for (const profile of staleProfiles) {
        try {
            await (0, exports.analyzeGithubProfile)(String(profile.userId), true);
        }
        catch (error) {
            console.error("GitHub sync job failed for user", String(profile.userId), error);
        }
    }
};
exports.syncStaleGithubProfiles = syncStaleGithubProfiles;
