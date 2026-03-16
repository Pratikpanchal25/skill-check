import { User } from "../models/user.model";
import { SkillCheckSession } from "../models/skill.check.session.model";
import { Judgement } from "../models/judgement.model";
import mongoose from "mongoose";

type LeanSession = {
    _id: mongoose.Types.ObjectId;
    skillName: string;
    mode: string;
    createdAt: Date;
};

type LeanJudgement = {
    sessionId: mongoose.Types.ObjectId;
    clarity?: number;
    correctness?: number;
    depth?: number;
    missingConcepts?: string[];
    createdAt?: Date;
};

type SessionWithLatestJudgements = {
    sessions: LeanSession[];
    judgementBySessionId: Map<string, LeanJudgement>;
};

const getSessionsWithLatestJudgements = async (userId: string): Promise<SessionWithLatestJudgements> => {
    const sessions = await SkillCheckSession.find({ userId })
        .sort({ createdAt: -1 })
        .lean() as unknown as LeanSession[];

    if (!sessions.length) {
        return { sessions: [], judgementBySessionId: new Map() };
    }

    const sessionIds = sessions.map((s) => s._id);
    const judgements = await Judgement.find({
        sessionId: { $in: sessionIds }
    })
        .sort({ createdAt: -1 })
        .lean() as unknown as LeanJudgement[];

    const judgementBySessionId = new Map<string, LeanJudgement>();
    for (const judgement of judgements) {
        const key = judgement.sessionId.toString();
        if (!judgementBySessionId.has(key)) {
            judgementBySessionId.set(key, judgement);
        }
    }

    return { sessions, judgementBySessionId };
};

export const createUser = async (userData: any) => {
    const user = new User(userData);
    return await user.save();
};

export const getUserOverview = async (userId: string) => {
    const { sessions, judgementBySessionId } = await getSessionsWithLatestJudgements(userId);

    // Aggregate scores per skill
    const skillStats: Record<string, any> = {};

    for (const session of sessions) {
        const judgement = judgementBySessionId.get(session._id.toString());
        if (!judgement) continue;

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

export const getUserActivity = async (userId: string) => {
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

export const getUserActivityCount = async (userId: string) => {
    const { sessions, judgementBySessionId } = await getSessionsWithLatestJudgements(userId);
    const total = sessions.length;
    const evaluated = sessions.filter((session) => judgementBySessionId.has(session._id.toString())).length;

    return {
        total,
        evaluated,
        pending: total - evaluated
    };
};

export const getUserDashboardData = async (userId: string) => {
    const { sessions, judgementBySessionId } = await getSessionsWithLatestJudgements(userId);

    const skillStats: Record<string, {
        clarity: number[];
        correctness: number[];
        depth: number[];
        missingConcepts: Set<string>;
        count: number;
    }> = {};

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

const average = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
