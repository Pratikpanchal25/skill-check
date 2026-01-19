import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

interface EvaluationResult {
  clarity: number;
  correctness: number;
  depth: number;
  missingConcepts: string[];
  reaction: "impressed" | "neutral" | "confused" | "skeptical";
}

export const evaluateAnswer = async (
  answerText: string,
  skillName: string,
): Promise<EvaluationResult> => {
  try {
    const prompt = `
You are a senior technical interviewer.

Evaluate the user's answer strictly for the skill: "${skillName}".

Scoring rules:
- clarity: how clearly the idea is explained (0-10)
- correctness: factual and conceptual accuracy (0-10)
- depth: level of insight and completeness (0-10)

Also:
- Identify important missing concepts (if any)
- Give a natural interviewer reaction

Return ONLY valid JSON in this exact format:

{
  "clarity": number,
  "correctness": number,
  "depth": number,
  "missingConcepts": string[],
  "reaction": "impressed" | "neutral" | "confused" | "skeptical"
}

User answer:
"""
${answerText}
"""
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const evaluation = JSON.parse(response.text || "{}");

    return {
      clarity: clamp(evaluation.clarity),
      correctness: clamp(evaluation.correctness),
      depth: clamp(evaluation.depth),
      missingConcepts: Array.isArray(evaluation.missingConcepts)
        ? evaluation.missingConcepts
        : [],
      reaction:
        evaluation.reaction === "impressed" ||
          evaluation.reaction === "neutral" ||
          evaluation.reaction === "confused" ||
          evaluation.reaction === "skeptical"
          ? evaluation.reaction
          : "neutral",
    };
  } catch (err) {
    console.error(err);
    return {
      clarity: 0,
      correctness: 0,
      depth: 0,
      missingConcepts: ["Evaluation failed"],
      reaction: "neutral",
    };
  }
};

// ---- helpers ----
function clamp(value: any): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.min(10, Math.max(0, n));
}
