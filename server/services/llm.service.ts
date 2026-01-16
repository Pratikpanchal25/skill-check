import { GoogleGenAI } from "@google/genai";

interface EvaluationResult {
    clarity: number;
    correctness: number;
    depth: number;
    missingConcepts: string[];
    reaction: "impressed" | "neutral" | "confused" | "skeptical";
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
});

export const evaluateAnswer = async (
    answerText: string,
    skillName: string
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

        const result = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });

        const evaluation = JSON.parse(result.text || "{}");

        return {
            clarity: Math.min(10, Math.max(0, Number(evaluation.clarity) || 0)),
            correctness: Math.min(10, Math.max(0, Number(evaluation.correctness) || 0)),
            depth: Math.min(10, Math.max(0, Number(evaluation.depth) || 0)),
            missingConcepts: evaluation.missingConcepts ?? [],
            reaction: evaluation.reaction ?? "neutral",
        };
    } catch (error) {
        console.error("LLM Evaluation Error:", error);
        // Return a neutral fallback instead of failing
        return {
            clarity: 0,
            correctness: 0,
            depth: 0,
            missingConcepts: ["Service temporarily unavailable"],
            reaction: "neutral",
        };
    }
};
