function getOptionalEnv(name: string, defaultValue: string | null = null) {
  const value = process.env[name];
  return value?.trim() || defaultValue;
}

export const env = {
  geminiApiKey: getOptionalEnv("GEMINI_API_KEY"),
  supabaseUrl: getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  groqApiKey: getOptionalEnv("GROQ_API_KEY"),
  groqVisionModel: getOptionalEnv("GROQ_VISION_MODEL"),
  aiVisionFallback: getOptionalEnv("AI_VISION_FALLBACK", "none"),
  isConfigured: function () {
    return Boolean(this.geminiApiKey && this.supabaseUrl && this.supabaseServiceRoleKey);
  },
  getMissingKeys: function () {
    const missing: string[] = [];
    if (!this.geminiApiKey) missing.push("GEMINI_API_KEY");
    if (!this.supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!this.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    return missing;
  },
};
