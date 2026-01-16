import { VertexAI } from "@google-cloud/vertexai";

interface EvaluationResult {
    clarity: number;
    correctness: number;
    depth: number;
    missingConcepts: string[];
    reaction: "impressed" | "neutral" | "confused" | "skeptical";
}

// Vertex AI client (uses GOOGLE_APPLICATION_CREDENTIALS automatically)
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID!,
    location: process.env.GCP_LOCATION || "us-central1",
});

const model = vertexAI.preview.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
    },
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

        const response = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }],
                },
            ],
        });

        const text =
            response.response.candidates?.[0]?.content?.parts?.[0]?.text;

        const evaluation = JSON.parse(text || "{}");

        return {
            clarity: clamp(evaluation.clarity),
            correctness: clamp(evaluation.correctness),
            depth: clamp(evaluation.depth),
            missingConcepts: Array.isArray(evaluation.missingConcepts)
                ? evaluation.missingConcepts
                : [],
            reaction:
                evaluation.reaction ??
                "neutral",
        };
    } catch (error) {
        console.error("LLM Evaluation Error:", error);
        return {
            clarity: 0,
            correctness: 0,
            depth: 0,
            missingConcepts: ["Service temporarily unavailable"],
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
