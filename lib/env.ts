function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is missing`);
  }

  return value;
}

function getOptionalEnv(name: string) {
  const value = process.env[name];

  return value?.trim() || null;
}

export const env = {
  geminiApiKey: getEnv("GEMINI_API_KEY"),
  supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  groqApiKey: getOptionalEnv("GROQ_API_KEY"),
  groqVisionModel: getOptionalEnv("GROQ_VISION_MODEL"),
  aiVisionFallback: getOptionalEnv("AI_VISION_FALLBACK") ?? "none",
};
