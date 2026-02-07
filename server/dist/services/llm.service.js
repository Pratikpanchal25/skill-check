"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAnswer = void 0;
const genai_1 = require("@google/genai");
const evaluateAnswer = async (answerText, skillName, voiceMetrics) => {
    const ai = new genai_1.GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    });
    try {
        // Build voice metrics context if available
        const voiceContext = voiceMetrics
            ? `
Voice Delivery Metrics:
- Words per minute (WPM): ${voiceMetrics.wpm ?? "N/A"}
- Filler words detected (um, uh, like, so, actually, basically, right, yeah): ${voiceMetrics.fillerWords ?? 0}
- Long pauses (>2 seconds): ${voiceMetrics.longPauses ?? 0}

Consider these metrics when scoring delivery. A good delivery has:
- WPM between 120-160 (too slow or too fast affects clarity)
- Minimal filler words (0-2 is excellent, 3-5 is acceptable, 6+ needs improvement)
- Few long pauses (0-1 is excellent, 2-3 is acceptable, 4+ indicates hesitation or uncertainty)
`
            : "";
        const prompt = `
You are a senior technical interviewer.

Evaluate the user's answer strictly for the skill: "${skillName}".

Scoring rules:
- clarity: how clearly the idea is explained (0-10)
- correctness: factual and conceptual accuracy (0-10)
- depth: level of insight and completeness (0-10)
- delivery: quality of verbal presentation including pace, confidence, and minimal filler words (0-10)${voiceContext ? "\n" + voiceContext : ""}

Also:
- Identify important missing concepts (if any)
- Give a natural interviewer reaction
- Provide a summary feedback about the user's explanation
- Provide specific improvement suggestions for the user
- If voice metrics are provided, give specific feedback about their delivery (pace, filler words, pauses)

Return ONLY valid JSON in this exact format:

{
  "clarity": number,
  "correctness": number,
  "depth": number,
  "delivery": number,
  "missingConcepts": string[],
  "reaction": "impressed" | "neutral" | "confused" | "skeptical",
  "feedback": "string",
  "improvementSuggestions": string[],
  "deliveryFeedback": "string describing voice delivery quality, filler word usage, and pacing"
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
        let evaluation = {};
        try {
            evaluation = JSON.parse(text);
        }
        catch (err) {
            console.log("err", err);
            const first = text.indexOf("{");
            const last = text.lastIndexOf("}");
            if (first !== -1 && last !== -1 && last > first) {
                const maybe = text.slice(first, last + 1);
                try {
                    evaluation = JSON.parse(maybe);
                }
                catch (err2) {
                    console.warn("Failed to parse extracted JSON from model output", err2);
                    evaluation = {};
                }
            }
            else {
                console.warn("Model output is not valid JSON and no JSON object could be extracted");
                evaluation = {};
            }
        }
        return {
            clarity: clamp(evaluation.clarity),
            correctness: clamp(evaluation.correctness),
            depth: clamp(evaluation.depth),
            delivery: clamp(evaluation.delivery),
            missingConcepts: Array.isArray(evaluation.missingConcepts)
                ? evaluation.missingConcepts
                : [],
            reaction: evaluation.reaction === "impressed" ||
                evaluation.reaction === "neutral" ||
                evaluation.reaction === "confused" ||
                evaluation.reaction === "skeptical"
                ? evaluation.reaction
                : "neutral",
            feedback: evaluation.feedback ||
                "Good effort! Continue practicing to sharpen your expertise.",
            improvementSuggestions: Array.isArray(evaluation.improvementSuggestions)
                ? evaluation.improvementSuggestions
                : [],
            deliveryFeedback: evaluation.deliveryFeedback ||
                "No voice metrics available for delivery analysis.",
        };
    }
    catch (err) {
        console.error("Gemini evaluation failed:", err);
        return {
            clarity: 0,
            correctness: 0,
            depth: 0,
            delivery: 0,
            missingConcepts: ["Evaluation failed"],
            reaction: "neutral",
            feedback: "We couldn't generate a detailed evaluation at this time. Please try again.",
            improvementSuggestions: [
                "Check your connection and retry the evaluation.",
            ],
            deliveryFeedback: "Evaluation failed - unable to analyze delivery.",
        };
    }
};
exports.evaluateAnswer = evaluateAnswer;
// ---- helpers ----
function clamp(value) {
    const n = Number(value);
    if (Number.isNaN(n))
        return 0;
    return Math.min(10, Math.max(0, n));
}
