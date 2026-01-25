"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvaluationBySessionId = exports.evaluateSession = void 0;
const judgement_model_1 = require("../models/judgement.model");
const user_answer_model_1 = require("../models/user.answer.model");
const skill_check_session_model_1 = require("../models/skill.check.session.model");
const voice_metrics_model_1 = require("../models/voice.metrics.model");
const llm_service_1 = require("./llm.service");
const evaluateSession = async (sessionId, answerId) => {
    const session = await skill_check_session_model_1.SkillCheckSession.findById(sessionId);
    if (!session)
        throw new Error("Session not found");
    let answer;
    if (answerId) {
        answer = await user_answer_model_1.UserAnswer.findById(answerId);
    }
    else {
        // Find latest answer for this session
        answer = await user_answer_model_1.UserAnswer.findOne({ sessionId }).sort({ createdAt: -1 });
    }
    if (!answer)
        throw new Error("No answer found for this session");
    // Check if evaluation already exists for THIS answer
    const existingEvaluation = await judgement_model_1.Judgement.findOne({ answerId: answer._id });
    if (existingEvaluation) {
        return existingEvaluation;
    }
    // Get skill name for context
    const skillName = session.skillName || "Unknown Skill";
    // Fetch voice metrics if available (for voice input type)
    let voiceMetricsData;
    if (session.inputType === "voice") {
        const metrics = await voice_metrics_model_1.VoiceMetrics.findOne({ sessionId }).sort({ createdAt: -1 });
        if (metrics) {
            voiceMetricsData = {
                wpm: metrics.wpm ?? undefined,
                fillerWords: metrics.fillerWords ?? undefined,
                longPauses: metrics.longPauses ?? undefined
            };
        }
    }
    // Call LLM service for evaluation with voice metrics
    const aiResult = await (0, llm_service_1.evaluateAnswer)(answer.rawText || answer.transcript || "", skillName, voiceMetricsData);
    // Create evaluation with model version
    const evaluation = new judgement_model_1.Judgement({
        sessionId,
        answerId: answer._id,
        clarity: aiResult.clarity,
        correctness: aiResult.correctness,
        depth: aiResult.depth,
        delivery: aiResult.delivery,
        missingConcepts: aiResult.missingConcepts,
        reaction: aiResult.reaction,
        feedback: aiResult.feedback,
        improvementSuggestions: aiResult.improvementSuggestions,
        deliveryFeedback: aiResult.deliveryFeedback,
        modelVersion: "gemini-2.5-flash"
    });
    return await evaluation.save();
};
exports.evaluateSession = evaluateSession;
const getEvaluationBySessionId = async (sessionId) => {
    const evaluation = await judgement_model_1.Judgement.findOne({ sessionId })
        .populate("sessionId")
        .lean();
    if (!evaluation)
        throw new Error("Evaluation not found");
    return evaluation;
};
exports.getEvaluationBySessionId = getEvaluationBySessionId;
