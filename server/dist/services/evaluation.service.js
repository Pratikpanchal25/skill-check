"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvaluationBySessionId = exports.evaluateSession = void 0;
const judgement_model_1 = require("../models/judgement.model");
const user_answer_model_1 = require("../models/user.answer.model");
const skill_check_session_model_1 = require("../models/skill.check.session.model");
const llm_service_1 = require("./llm.service");
const evaluateSession = async (sessionId) => {
    const session = await skill_check_session_model_1.SkillCheckSession.findById(sessionId).populate("skillId");
    if (!session)
        throw new Error("Session not found");
    const answer = await user_answer_model_1.UserAnswer.findOne({ sessionId });
    if (!answer)
        throw new Error("No answer found for this session");
    // Check if evaluation already exists
    const existingEvaluation = await judgement_model_1.Judgement.findOne({ sessionId });
    if (existingEvaluation) {
        // Return existing evaluation - don't overwrite
        return existingEvaluation;
    }
    // Get skill name for context
    const skillName = session.skillId.name || "Unknown Skill";
    // Call LLM service for evaluation
    const aiResult = await (0, llm_service_1.evaluateAnswer)(answer.rawText || answer.transcript || "", skillName);
    // Create evaluation with model version
    const evaluation = new judgement_model_1.Judgement({
        sessionId,
        clarity: aiResult.clarity,
        correctness: aiResult.correctness,
        depth: aiResult.depth,
        missingConcepts: aiResult.missingConcepts,
        reaction: aiResult.reaction,
        modelVersion: "gpt-4-preview" // Update with actual version
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
