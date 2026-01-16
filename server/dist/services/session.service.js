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
    // Check if answer already exists for this session
    const existingAnswer = await user_answer_model_1.UserAnswer.findOne({ sessionId });
    if (existingAnswer) {
        throw new Error("Answer already exists for this session");
    }
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
        .populate("skillId")
        .populate("userId")
        .lean();
    if (!session)
        throw new Error("Session not found");
    return session;
};
exports.getSessionById = getSessionById;
const getSessionSummary = async (sessionId) => {
    const session = await skill_check_session_model_1.SkillCheckSession.findById(sessionId).populate("skillId");
    if (!session)
        throw new Error("Session not found");
    const answer = await user_answer_model_1.UserAnswer.findOne({ sessionId });
    const evaluation = await judgement_model_1.Judgement.findOne({ sessionId });
    const voiceMetrics = await voice_metrics_model_1.VoiceMetrics.findOne({ sessionId });
    return {
        session,
        answer,
        evaluation,
        voiceMetrics
    };
};
exports.getSessionSummary = getSessionSummary;
