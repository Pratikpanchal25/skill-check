import { SkillCheckSession } from "../models/skill.check.session.model";
import { UserAnswer } from "../models/user.answer.model";
import { VoiceMetrics } from "../models/voice.metrics.model";
import { Judgement } from "../models/judgement.model";

interface CreateSessionData {
    userId: string;

    skillName: string;
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
        .populate("userId")
        .lean();
    if (!session) throw new Error("Session not found");
    return session;
};

export const getSessionSummary = async (sessionId: string) => {
    const session = await SkillCheckSession.findById(sessionId);
    if (!session) throw new Error("Session not found");

    const answers = await UserAnswer.find({ sessionId }).sort({ createdAt: -1 });
    const voiceMetrics = await VoiceMetrics.findOne({ sessionId }).sort({ createdAt: -1 });

    const attempts = await Promise.all(answers.map(async (answer) => {
        // Find evaluation specifically for this answer first
        let evaluation = await Judgement.findOne({ answerId: answer._id });

        // Fallback for legacy data (if only one answer exists and evaluation has no answerId)
        if (!evaluation && answers.length === 1) {
            evaluation = await Judgement.findOne({ sessionId: answer.sessionId, answerId: { $exists: false } });
        }

        return {
            answer: {
                _id: answer._id.toString(),
                rawText: answer.rawText,
                transcript: answer.transcript,
                createdAt: answer.createdAt
            },
            evaluation: evaluation ? {
                clarity: evaluation.clarity,
                correctness: evaluation.correctness,
                depth: evaluation.depth,
                missingConcepts: evaluation.missingConcepts,
                reaction: evaluation.reaction,
                feedback: evaluation.feedback,
                improvementSuggestions: evaluation.improvementSuggestions
            } : null
        };
    }));

    return {
        session,
        attempts,
        voiceMetrics
    };
};
