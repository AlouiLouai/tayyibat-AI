import "server-only";

import { env } from "@/lib/env";
import { analyzeMealImageWithGemini } from "@/lib/gemini";
import { analyzeMealImageWithGroq } from "@/lib/groq";

type VisionInput = {
  mimeType: string;
  base64Data: string;
  note?: string;
};

export async function analyzeMealImage(input: VisionInput) {
  const shouldTryGroqFirst = Boolean(env.groqApiKey && env.groqVisionModel);

  if (shouldTryGroqFirst) {
    try {
      return await analyzeMealImageWithGroq(input);
    } catch (error) {
      if (env.aiVisionFallback !== "gemini") {
        throw error;
      }

      console.error("Groq vision failed, falling back to Gemini", error);
    }
  }

  return analyzeMealImageWithGemini(input);
}
