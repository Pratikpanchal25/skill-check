"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDashboardData = exports.getUserActivityCount = exports.getUserActivity = exports.getUserOverview = exports.createUser = void 0;
const user_model_1 = require("../models/user.model");
const skill_check_session_model_1 = require("../models/skill.check.session.model");
const judgement_model_1 = require("../models/judgement.model");
const getSessionsWithLatestJudgements = async (userId) => {
    const sessions = await skill_check_session_model_1.SkillCheckSession.find({ userId })
        .sort({ createdAt: -1 })
        .lean();
    if (!sessions.length) {
        return { sessions: [], judgementBySessionId: new Map() };
    }
    const sessionIds = sessions.map((s) => s._id);
    const judgements = await judgement_model_1.Judgement.find({
        sessionId: { $in: sessionIds }
    })
        .sort({ createdAt: -1 })
        .lean();
    const judgementBySessionId = new Map();
    for (const judgement of judgements) {
        const key = judgement.sessionId.toString();
        if (!judgementBySessionId.has(key)) {
            judgementBySessionId.set(key, judgement);
        }
    }
    return { sessions, judgementBySessionId };
};
const createUser = async (userData) => {
    const user = new user_model_1.User(userData);
    return await user.save();
};
exports.createUser = createUser;
const getUserOverview = async (userId) => {
    const { sessions, judgementBySessionId } = await getSessionsWithLatestJudgements(userId);
    // Aggregate scores per skill
    const skillStats = {};
    for (const session of sessions) {
        const judgement = judgementBySessionId.get(session._id.toString());
        if (!judgement)
            continue;
        const skillName = session.skillName;
        if (!skillStats[skillName]) {
            skillStats[skillName] = {
                clarity: [], correctness: [], depth: [],
                missingConcepts: new Set(), count: 0
            };
        }
        skillStats[skillName].clarity.push(judgement.clarity || 0);
        skillStats[skillName].correctness.push(judgement.correctness || 0);
        skillStats[skillName].depth.push(judgement.depth || 0);
        const missingConcepts = judgement.missingConcepts ?? [];
        missingConcepts.forEach((c) => skillStats[skillName].missingConcepts.add(c));
        skillStats[skillName].count++;
    }
    const overview = Object.keys(skillStats).map(skill => ({
        skill,
        averageClarity: average(skillStats[skill].clarity),
        averageCorrectness: average(skillStats[skill].correctness),
        averageDepth: average(skillStats[skill].depth),
        totalMissingConcepts: Array.from(skillStats[skill].missingConcepts),
        sessionCount: skillStats[skill].count
    }));
    return overview;
};
exports.getUserOverview = getUserOverview;
const getUserActivity = async (userId) => {
    const { sessions, judgementBySessionId } = await getSessionsWithLatestJudgements(userId);
    const activity = sessions.map((session) => {
        const judgement = judgementBySessionId.get(session._id.toString());
        const score = judgement
            ? ((judgement.correctness || 0) + (judgement.clarity || 0) + (judgement.depth || 0)) / 3
            : null;
        return {
            id: session._id.toString(),
            skill: session.skillName,
            mode: session.mode,
            createdAt: session.createdAt.toISOString(),
            evaluated: !!judgement,
            score
        };
    });
    return activity;
};
exports.getUserActivity = getUserActivity;
const getUserActivityCount = async (userId) => {
    const { sessions, judgementBySessionId } = await getSessionsWithLatestJudgements(userId);
    const total = sessions.length;
    const evaluated = sessions.filter((session) => judgementBySessionId.has(session._id.toString())).length;
    return {
        total,
        evaluated,
        pending: total - evaluated
    };
};
exports.getUserActivityCount = getUserActivityCount;
const getUserDashboardData = async (userId) => {
    const { sessions, judgementBySessionId } = await getSessionsWithLatestJudgements(userId);
    const skillStats = {};
    const activities = sessions.map((session) => {
        const judgement = judgementBySessionId.get(session._id.toString());
        const score = judgement
            ? ((judgement.correctness || 0) + (judgement.clarity || 0) + (judgement.depth || 0)) / 3
            : null;
        if (judgement) {
            const skillName = session.skillName;
            if (!skillStats[skillName]) {
                skillStats[skillName] = {
                    clarity: [],
                    correctness: [],
                    depth: [],
                    missingConcepts: new Set(),
                    count: 0
                };
            }
            skillStats[skillName].clarity.push(judgement.clarity || 0);
            skillStats[skillName].correctness.push(judgement.correctness || 0);
            skillStats[skillName].depth.push(judgement.depth || 0);
            (judgement.missingConcepts || []).forEach((c) => skillStats[skillName].missingConcepts.add(c));
            skillStats[skillName].count++;
        }
        return {
            id: session._id.toString(),
            skill: session.skillName,
            mode: session.mode,
            createdAt: session.createdAt.toISOString(),
            evaluated: !!judgement,
            score
        };
    });
    const overview = Object.keys(skillStats).map((skill) => ({
        skill,
        averageClarity: average(skillStats[skill].clarity),
        averageCorrectness: average(skillStats[skill].correctness),
        averageDepth: average(skillStats[skill].depth),
        totalMissingConcepts: Array.from(skillStats[skill].missingConcepts),
        sessionCount: skillStats[skill].count
    }));
    const evaluatedCount = activities.filter((item) => item.evaluated).length;
    return {
        overview,
        activities,
        counts: {
            sessions: activities.length,
            evaluatedSessions: evaluatedCount,
            pendingSessions: activities.length - evaluatedCount,
            skillsPracticed: overview.length
        }
    };
};
exports.getUserDashboardData = getUserDashboardData;
const average = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
