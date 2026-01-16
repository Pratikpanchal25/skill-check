import { User } from "../models/user.model";
import { SkillCheckSession } from "../models/skill.check.session.model";
import { Judgement } from "../models/judgement.model";
import mongoose from "mongoose";

export const createUser = async (userData: any) => {
    const user = new User(userData);
    return await user.save();
};

export const getUserOverview = async (userId: string) => {
    const sessions = await SkillCheckSession.find({ userId }).populate("skillId");

    // Aggregate scores per skill
    const skillStats: Record<string, any> = {};

    for (const session of sessions) {
        const judgement = await Judgement.findOne({ sessionId: session._id });
        if (!judgement) continue;

        const skillName = (session.skillId as any).name;
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

export const getUserActivity = async (userId: string) => {
    const sessions = await SkillCheckSession.find({ userId })
        .populate("skillId")
        .sort({ createdAt: -1 });

    const activity = await Promise.all(sessions.map(async (session) => {
        const judgement = await Judgement.findOne({ sessionId: session._id });
        const score = judgement
            ? ((judgement.correctness || 0) + (judgement.clarity || 0) + (judgement.depth || 0)) / 3
            : null;

        return {
            id: session._id,
            skill: (session.skillId as any).name,
            mode: session.mode,
            createdAt: session.createdAt,
            evaluated: !!judgement,
            score
        };
    }));

    return activity;
};

const average = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
