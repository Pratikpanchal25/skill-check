"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserActivity = exports.getUserOverview = exports.createUser = void 0;
const user_model_1 = require("../models/user.model");
const skill_check_session_model_1 = require("../models/skill.check.session.model");
const judgement_model_1 = require("../models/judgement.model");
const createUser = async (userData) => {
    const user = new user_model_1.User(userData);
    return await user.save();
};
exports.createUser = createUser;
const getUserOverview = async (userId) => {
    const sessions = await skill_check_session_model_1.SkillCheckSession.find({ userId });
    // Aggregate scores per skill
    const skillStats = {};
    for (const session of sessions) {
        const judgement = await judgement_model_1.Judgement.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
        if (!judgement)
            continue;
        const skillName = session.skillName;
        if (!skillStats[skillName]) {
            skillStats[skillName] = {
                clarity: [], correctness: [], depth: [],
                missingConcepts: new Set(), count: 0
            };
        }
        skillStats[skillName].clarity.push(judgement.clarity);
        skillStats[skillName].correctness.push(judgement.correctness);
        skillStats[skillName].depth.push(judgement.depth);
        judgement.missingConcepts.forEach(c => skillStats[skillName].missingConcepts.add(c));
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
    const sessions = await skill_check_session_model_1.SkillCheckSession.find({ userId })
        .sort({ createdAt: -1 });
    const activity = await Promise.all(sessions.map(async (session) => {
        const judgement = await judgement_model_1.Judgement.findOne({ sessionId: session._id }).sort({ createdAt: -1 });
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
    }));
    return activity;
};
exports.getUserActivity = getUserActivity;
const average = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
