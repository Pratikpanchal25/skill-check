import { Judgement } from "../models/judgement.model";
import { UserAnswer } from "../models/user.answer.model";
import { SkillCheckSession } from "../models/skill.check.session.model";
import { VoiceMetrics } from "../models/voice.metrics.model";
import { evaluateAnswer } from "./llm.service";

export const evaluateSession = async (sessionId: string) => {
    const session = await SkillCheckSession.findById(sessionId).populate("skillId");
    if (!session) throw new Error("Session not found");

    const answer = await UserAnswer.findOne({ sessionId });
    if (!answer) throw new Error("No answer found for this session");

    // Check if evaluation already exists
    const existingEvaluation = await Judgement.findOne({ sessionId });
    if (existingEvaluation) {
        // Return existing evaluation - don't overwrite
        return existingEvaluation;
    }

    // Get skill name for context
    const skillName = (session.skillId as any).name || "Unknown Skill";

    // Call LLM service for evaluation
    const aiResult = await evaluateAnswer(answer.rawText || answer.transcript || "", skillName);

    // Create evaluation with model version
    const evaluation = new Judgement({
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

export const getEvaluationBySessionId = async (sessionId: string) => {
    const evaluation = await Judgement.findOne({ sessionId })
        .populate("sessionId")
        .lean();
    if (!evaluation) throw new Error("Evaluation not found");
    return evaluation;
};

