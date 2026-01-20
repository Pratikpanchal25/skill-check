import { GoogleGenAI } from "@google/genai";

interface EvaluationResult {
  clarity: number;
  correctness: number;
  depth: number;
  missingConcepts: string[];
  reaction: "impressed" | "neutral" | "confused" | "skeptical";
  feedback: string;
  improvementSuggestions: string[];
}

export const evaluateAnswer = async (
  answerText: string,
  skillName: string
): Promise<EvaluationResult> => {

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!
  });
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
- Provide a summary feedback about the user's explanation
- Provide specific improvement suggestions for the user

Return ONLY valid JSON in this exact format:

{
  "clarity": number,
  "correctness": number,
  "depth": number,
  "missingConcepts": string[],
  "reaction": "impressed" | "neutral" | "confused" | "skeptical",
  "feedback": "string",
  "improvementSuggestions": string[]
}

User answer:
"""
${answerText}
"""
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    let evaluation: any = {};
    try {
      evaluation = JSON.parse(text);
    } catch (err) {
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) {
        const maybe = text.slice(first, last + 1);
        try {
          evaluation = JSON.parse(maybe);
        } catch (err2) {
          console.warn('Failed to parse extracted JSON from model output', err2);
          evaluation = {};
        }
      } else {
        console.warn('Model output is not valid JSON and no JSON object could be extracted');
        evaluation = {};
      }
    }

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
      feedback: evaluation.feedback || "Good effort! Continue practicing to sharpen your expertise.",
      improvementSuggestions: Array.isArray(evaluation.improvementSuggestions)
        ? evaluation.improvementSuggestions
        : [],
    };
  } catch (err) {
    console.error("Gemini evaluation failed:", err);
    return {
      clarity: 0,
      correctness: 0,
      depth: 0,
      missingConcepts: ["Evaluation failed"],
      reaction: "neutral",
      feedback: "We couldn't generate a detailed evaluation at this time. Please try again.",
      improvementSuggestions: ["Check your connection and retry the evaluation."]
    };
  }
};

// ---- helpers ----
function clamp(value: any): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.min(10, Math.max(0, n));
}
