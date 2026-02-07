import { Judgement } from "../models/judgement.model";
import { UserAnswer } from "../models/user.answer.model";
import { SkillCheckSession } from "../models/skill.check.session.model";
import { VoiceMetrics } from "../models/voice.metrics.model";
import { evaluateAnswer } from "./llm.service";

export const evaluateSession = async (sessionId: string, answerId?: string) => {
  const session = await SkillCheckSession.findById(sessionId);
  if (!session) throw new Error("Session not found");

  let answer;
  if (answerId) {
    answer = await UserAnswer.findById(answerId);
  } else {
    // Find latest answer for this session
    answer = await UserAnswer.findOne({ sessionId }).sort({ createdAt: -1 });
  }

  if (!answer) throw new Error("No answer found for this session");

  // Check if evaluation already exists for THIS answer
  const existingEvaluation = await Judgement.findOne({ answerId: answer._id });
  if (existingEvaluation) {
    return existingEvaluation;
  }

  // Get skill name for context
  const skillName = session.skillName || "Unknown Skill";

  // Fetch voice metrics if available (for voice input type)
  let voiceMetricsData;
  if (session.inputType === "voice") {
    const metrics = await VoiceMetrics.findOne({ sessionId }).sort({
      createdAt: -1,
    });
    if (metrics) {
      voiceMetricsData = {
        wpm: metrics.wpm ?? undefined,
        fillerWords: metrics.fillerWords ?? undefined,
        longPauses: metrics.longPauses ?? undefined,
      };
    }
  }

  // Call LLM service for evaluation with voice metrics
  let aiResult;
  try {
    aiResult = await evaluateAnswer(
      answer.rawText || answer.transcript || "",
      skillName,
      voiceMetricsData,
    );
  } catch (llmError) {
    console.error("LLM evaluation failed:", llmError);
    // Return a pending evaluation marker so frontend knows to show re-evaluate
    return {
      evaluationPending: true,
      answerId: answer._id,
      sessionId,
      error: "LLM evaluation failed. Please try again.",
    };
  }

  // Create evaluation with model version
  const evaluation = new Judgement({
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
    modelVersion: "gemini-2.5-flash",
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
