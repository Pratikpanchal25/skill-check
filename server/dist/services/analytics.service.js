"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserReadinessScore = exports.getUserSkillGaps = exports.getUserProgress = void 0;
const skill_check_session_model_1 = require("../models/skill.check.session.model");
const judgement_model_1 = require("../models/judgement.model");
const getUserProgress = async (userId) => {
    const sessions = await skill_check_session_model_1.SkillCheckSession.find({ userId })
        .populate("skillId")
        .sort({ createdAt: -1 })
        .lean();
    const skillMap = new Map();
    // Group sessions by skill
    for (const session of sessions) {
        const skillId = session.skillId?._id?.toString();
        const skillName = session.skillId?.name;
        if (!skillId || !skillName)
            continue;
        if (!skillMap.has(skillId)) {
            skillMap.set(skillId, {
                skill: skillName,
                skillId,
                sessions: [],
                evaluations: []
            });
        }
        skillMap.get(skillId).sessions.push(session);
    }
    // Get evaluations for all sessions
    const sessionIds = sessions.map(s => s._id.toString());
    const evaluations = await judgement_model_1.Judgement.find({
        sessionId: { $in: sessionIds }
    }).lean();
    const evaluationMap = new Map();
    for (const evaluation of evaluations) {
        evaluationMap.set(evaluation.sessionId.toString(), evaluation);
    }
    // Calculate progress per skill
    const progress = [];
    for (const [skillId, data] of skillMap.entries()) {
        const skillEvaluations = data.sessions
            .map((s) => evaluationMap.get(s._id.toString()))
            .filter((e) => e != null);
        if (skillEvaluations.length === 0)
            continue;
        const scores = skillEvaluations.map((e) => (e.clarity + e.correctness + e.depth) / 3);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        // Determine trend (comparing first half vs second half)
        let trend = "stable";
        if (scores.length >= 4) {
            const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
            const secondHalf = scores.slice(Math.floor(scores.length / 2));
            const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
            if (secondAvg > firstAvg + 0.5)
                trend = "improving";
            else if (secondAvg < firstAvg - 0.5)
                trend = "declining";
        }
        const lastEval = skillEvaluations[skillEvaluations.length - 1];
        const lastSession = data.sessions.find((s) => s._id.toString() === lastEval.sessionId.toString());
        progress.push({
            skill: data.skill,
            skillId,
            sessions: skillEvaluations.length,
            averageScore: Math.round(averageScore * 10) / 10,
            trend,
            lastEvaluated: lastSession?.createdAt || null
        });
    }
    return progress;
};
exports.getUserProgress = getUserProgress;
const getUserSkillGaps = async (userId) => {
    const sessions = await skill_check_session_model_1.SkillCheckSession.find({ userId })
        .populate("skillId")
        .lean();
    const sessionIds = sessions.map(s => s._id.toString());
    const evaluations = await judgement_model_1.Judgement.find({
        sessionId: { $in: sessionIds }
    }).lean();
    const gapMap = new Map();
    for (const evaluation of evaluations) {
        const session = sessions.find(s => s._id.toString() === evaluation.sessionId.toString());
        if (!session)
            continue;
        const skillId = session.skillId?._id?.toString();
        const skillName = session.skillId?.name;
        const category = session.skillId?.category;
        if (!skillId || !skillName)
            continue;
        if (!gapMap.has(skillId)) {
            gapMap.set(skillId, {
                skill: skillName,
                skillId,
                category: category || "unknown",
                missingConcepts: new Map(),
                scores: []
            });
        }
        const gap = gapMap.get(skillId);
        // Ensure properties exist before accessing
        const clarity = evaluation.clarity || 0;
        const correctness = evaluation.correctness || 0;
        const depth = evaluation.depth || 0;
        gap.scores.push((clarity + correctness + depth) / 3);
        for (const concept of evaluation.missingConcepts || []) {
            gap.missingConcepts.set(concept, (gap.missingConcepts.get(concept) || 0) + 1);
        }
    }
    const skillGaps = [];
    for (const [skillId, data] of gapMap.entries()) {
        // Sort missing concepts by frequency
        const sortedConcepts = Array.from(data.missingConcepts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([concept]) => concept);
        const averageScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        skillGaps.push({
            skill: data.skill,
            skillId,
            category: data.category,
            missingConcepts: sortedConcepts,
            frequency: data.scores.length,
            averageScore: Math.round(averageScore * 10) / 10
        });
    }
    // Sort by average score (lowest first - biggest gaps)
    skillGaps.sort((a, b) => a.averageScore - b.averageScore);
    return skillGaps;
};
exports.getUserSkillGaps = getUserSkillGaps;
const getUserReadinessScore = async (userId) => {
    const sessions = await skill_check_session_model_1.SkillCheckSession.find({ userId })
        .populate("skillId")
        .lean();
    const sessionIds = sessions.map(s => s._id.toString());
    const evaluations = await judgement_model_1.Judgement.find({
        sessionId: { $in: sessionIds }
    }).lean();
    const evaluationMap = new Map();
    for (const evaluation of evaluations) {
        evaluationMap.set(evaluation.sessionId.toString(), evaluation);
    }
    const categoryMap = new Map();
    for (const session of sessions) {
        const skillId = session.skillId?._id?.toString();
        const skillName = session.skillId?.name;
        const category = session.skillId?.category || "unknown";
        const evaluation = evaluationMap.get(session._id.toString());
        if (!evaluation)
            continue;
        const clarity = evaluation.clarity || 0;
        const correctness = evaluation.correctness || 0;
        const depth = evaluation.depth || 0;
        const score = (clarity + correctness + depth) / 3;
        if (!categoryMap.has(category)) {
            categoryMap.set(category, { skills: new Map() });
        }
        const catData = categoryMap.get(category);
        if (!catData.skills.has(skillName)) {
            catData.skills.set(skillName, []);
        }
        catData.skills.get(skillName).push(score);
    }
    const byCategory = [];
    let totalScore = 0;
    let totalCount = 0;
    for (const [category, data] of categoryMap.entries()) {
        const skills = [];
        for (const [skillName, scores] of data.skills.entries()) {
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            skills.push({
                skill: skillName,
                score: Math.round(avgScore * 10) / 10
            });
            totalScore += avgScore;
            totalCount += 1;
        }
        const categoryScore = skills.length > 0
            ? skills.reduce((sum, s) => sum + s.score, 0) / skills.length
            : 0;
        byCategory.push({
            category,
            score: Math.round(categoryScore * 10) / 10,
            skills
        });
    }
    const overall = totalCount > 0
        ? Math.round((totalScore / totalCount) * 10) / 10
        : 0;
    return {
        overall,
        byCategory
    };
};
exports.getUserReadinessScore = getUserReadinessScore;
