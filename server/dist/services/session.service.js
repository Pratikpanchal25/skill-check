"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionSummary = exports.getSessionById = exports.submitAnswer = exports.createSession = void 0;
const skill_check_session_model_1 = require("../models/skill.check.session.model");
const user_answer_model_1 = require("../models/user.answer.model");
const voice_metrics_model_1 = require("../models/voice.metrics.model");
const judgement_model_1 = require("../models/judgement.model");
const createSession = async (sessionData) => {
    const session = new skill_check_session_model_1.SkillCheckSession(sessionData);
    return await session.save();
};
exports.createSession = createSession;
const submitAnswer = async (sessionId, answerData) => {
    const answer = new user_answer_model_1.UserAnswer({
        sessionId,
        rawText: answerData.rawText,
        transcript: answerData.transcript,
        duration: answerData.duration
    });
    await answer.save();
    // Only create voice metrics if voiceMetrics are provided and session is voice type
    if (answerData.voiceMetrics) {
        const session = await skill_check_session_model_1.SkillCheckSession.findById(sessionId);
        if (session && session.inputType === "voice") {
            const metrics = new voice_metrics_model_1.VoiceMetrics({
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
exports.submitAnswer = submitAnswer;
// Evaluation logic moved to evaluation.service.ts
const getSessionById = async (sessionId) => {
    const session = await skill_check_session_model_1.SkillCheckSession.findById(sessionId)
        .populate("userId")
        .lean();
    if (!session)
        throw new Error("Session not found");
    return session;
};
exports.getSessionById = getSessionById;
const getSessionSummary = async (sessionId) => {
    const session = await skill_check_session_model_1.SkillCheckSession.findById(sessionId);
    if (!session)
        throw new Error("Session not found");
    const answers = await user_answer_model_1.UserAnswer.find({ sessionId }).sort({ createdAt: -1 });
    const voiceMetrics = await voice_metrics_model_1.VoiceMetrics.findOne({ sessionId }).sort({ createdAt: -1 });
    const attempts = await Promise.all(answers.map(async (answer) => {
        // Find evaluation specifically for this answer first
        let evaluation = await judgement_model_1.Judgement.findOne({ answerId: answer._id });
        // Fallback for legacy data (if only one answer exists and evaluation has no answerId)
        if (!evaluation && answers.length === 1) {
            evaluation = await judgement_model_1.Judgement.findOne({ sessionId: answer.sessionId, answerId: { $exists: false } });
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
exports.getSessionSummary = getSessionSummary;
