import { SkillCheckSession } from "../models/skill.check.session.model";
import { UserAnswer } from "../models/user.answer.model";
import { VoiceMetrics } from "../models/voice.metrics.model";
import { Judgement } from "../models/judgement.model";

interface CreateSessionData {
    userId: string;
    skillId: string;
    mode: "explain" | "drill" | "blind";
    inputType: "voice" | "text";
}

export const createSession = async (sessionData: CreateSessionData) => {
    const session = new SkillCheckSession(sessionData);
    return await session.save();
};

interface SubmitAnswerData {
    rawText: string;
    transcript?: string;
    audioUrl?: string;
    duration?: number;
    voiceMetrics?: {
        wpm?: number;
        fillerWords?: number;
        longPauses?: number;
    };
}

export const submitAnswer = async (sessionId: string, answerData: SubmitAnswerData) => {
    // Check if answer already exists for this session
    const existingAnswer = await UserAnswer.findOne({ sessionId });
    if (existingAnswer) {
        throw new Error("Answer already exists for this session");
    }

    const answer = new UserAnswer({
        sessionId,
        rawText: answerData.rawText,
        transcript: answerData.transcript,
        duration: answerData.duration
    });
    await answer.save();

    // Only create voice metrics if voiceMetrics are provided and session is voice type
    if (answerData.voiceMetrics) {
        const session = await SkillCheckSession.findById(sessionId);
        if (session && session.inputType === "voice") {
            const metrics = new VoiceMetrics({
                sessionId,
                wpm: answerData.voiceMetrics.wpm,
                fillerWords: answerData.voiceMetrics.fillerWords,
                longPauses: answerData.voiceMetrics.longPauses
            });
            await metrics.save();
        }
    }

    return answer;
};

// Evaluation logic moved to evaluation.service.ts

export const getSessionById = async (sessionId: string) => {
    const session = await SkillCheckSession.findById(sessionId)
        .populate("skillId")
        .populate("userId")
        .lean();
    if (!session) throw new Error("Session not found");
    return session;
};

export const getSessionSummary = async (sessionId: string) => {
    const session = await SkillCheckSession.findById(sessionId).populate("skillId");
    if (!session) throw new Error("Session not found");

    const answer = await UserAnswer.findOne({ sessionId });
    const evaluation = await Judgement.findOne({ sessionId });
    const voiceMetrics = await VoiceMetrics.findOne({ sessionId });

    return {
        session,
        answer,
        evaluation,
        voiceMetrics
    };
};
