import { SkillCheckSession } from "../models/skill.check.model";
import { UserAnswer } from "../models/user.answer.model";
import { Judgement } from "../models/judgement.model";
import { VoiceMetrics } from "../models/voice.metrics.model";

export const createSession = async (sessionData: any) => {
    const session = new SkillCheckSession(sessionData);
    return await session.save();
};

export const submitAnswer = async (sessionId: string, answerData: any) => {
    const answer = new UserAnswer({ sessionId, ...answerData });
    await answer.save();

    if (answerData.voiceMetrics) {
        const metrics = new VoiceMetrics({ sessionId, ...answerData.voiceMetrics });
        await metrics.save();
    }

    return answer;
};

export const evaluateSession = async (sessionId: string) => {
    const answer = await UserAnswer.findOne({ sessionId });
    if (!answer) throw new Error("No answer found for this session");

    // TODO: AI Evaluation logic
    // const aiResult = await callAI(answer.rawText);

    const evaluation = new Judgement({
        sessionId,
        clarity: 8, // Placeholder
        correctness: 7, // Placeholder
        depth: 6, // Placeholder
        missingConcepts: ["Concept A", "Concept B"], // Placeholder
        reaction: "neutral",
        modelVersion: "gpt-4-preview"
    });

    return await evaluation.save();
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
