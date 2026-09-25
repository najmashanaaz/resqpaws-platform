import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

const LANG = { en: 'English', ta: 'Tamil', hi: 'Hindi', te: 'Telugu', kn: 'Kannada' };

// Script patterns to auto-detect language from text
const SCRIPT_PATTERNS = {
  ta: /[\u0B80-\u0BFF]/,   // Tamil
  hi: /[\u0900-\u097F]/,   // Devanagari (Hindi)
  te: /[\u0C00-\u0C7F]/,   // Telugu
  kn: /[\u0C80-\u0CFF]/,   // Kannada
};

/**
 * Detect language from message text by Unicode script ranges.
 * Returns a lang code if script detected, otherwise falls back to `preferred`.
 */
function detectLanguage(text, preferred = 'en') {
  for (const [code, pattern] of Object.entries(SCRIPT_PATTERNS)) {
    if (pattern.test(text)) return code;
  }
  return preferred;
}

/**
 * Build a strong multilingual system instruction that forces Gemini
 * to always reply in the detected/selected language.
 */
function buildSystem(language, location) {
  const langName = LANG[language] || 'English';

  const locationCtx = location
    ? `The user is located in ${[location.city, location.district, location.state].filter(Boolean).join(', ')}, India. ` +
      `When suggesting nearby help (vets, shelters, NGOs, rescue centres), always mention this area specifically.`
    : `If the user asks about nearby help, ask them to share their city or state so you can give relevant suggestions.`;

  return (
    `You are the ResQPaws assistant — a friendly, knowledgeable helper for animal care, pet health, ` +
    `vaccination schedules, feeding, first aid, and animal rescue in India.\n\n` +

    `LANGUAGE RULE (CRITICAL): You MUST reply ONLY in ${langName}. ` +
    `Do NOT switch to English or any other language under any circumstances, even if the user writes in mixed languages. ` +
    `If the user writes in ${langName}, respond entirely in ${langName}. ` +
    `All answers, suggestions, error messages, and follow-up questions must be in ${langName}.\n\n` +

    `LOCATION CONTEXT: ${locationCtx}\n\n` +

    `RESPONSE RULES:\n` +
    `- Keep answers short and practical (under 180 words).\n` +
    `- For emergencies, injuries, or poisoning: immediately tell the person to contact a veterinarian.\n` +
    `- Never give specific drug dosages.\n` +
    `- You are NOT a replacement for a licensed veterinarian.\n` +
    `- Use compassionate, clear language appropriate for pet owners and animal rescuers.\n` +
    `- When suggesting resources (vets, shelters, NGOs), be specific to the user's region if known.\n` +
    `- For sound analysis requests, interpret what the animal sound may indicate using phrases like ` +
    `  "possibly", "likely", "may indicate" — never claim certainty.`
  );
}

async function callGeminiWithFallback(body) {
  const models = Array.from(new Set([
    env.geminiModel,
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite'
  ])).filter(Boolean);

  let lastError;
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(25000),
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        lastError = new Error(`Model ${model} returned ${res.status}: ${errText}`);
        // If 404 or 503, try next candidate model
        if (res.status === 404 || res.status === 503 || res.status === 429) {
          continue;
        }
        break;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      if (text) return text.trim();
    } catch (e) {
      lastError = e;
    }
  }

  console.error('All Gemini model fallbacks failed:', lastError?.message);
  throw new ApiError(502, 'The chatbot service returned an error. Please try again later.', 'CHAT_UPSTREAM');
}

export async function askGemini({ message, history = [], language = 'en', location = null, image = null }) {
  if (!env.geminiKey) {
    throw new ApiError(
      503,
      'The chatbot is not set up yet. Add GEMINI_API_KEY to the server .env file.',
      'CHAT_NOT_CONFIGURED'
    );
  }

  // Auto-detect language from the message text; fall back to user's chosen language
  const detectedLang = detectLanguage(message, language);
  const system = buildSystem(detectedLang, location);

  const contents = [
    ...history.slice(-10).map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }, ...(image ? [{ inlineData: { mimeType: image.mimeType, data: image.data } }] : [])] },
  ];

  return callGeminiWithFallback({
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 512,
    },
  });
}

/**
 * Analyse a detected animal sound and return a structured explanation.
 * Used by the Sound Detection page "Ask Gemini" feature.
 */
export async function askGeminiAboutSound({ animal, soundType, confidence, language = 'en', location = null }) {
  if (!env.geminiKey) {
    throw new ApiError(503, 'The chatbot is not set up yet. Add GEMINI_API_KEY to the server .env file.', 'CHAT_NOT_CONFIGURED');
  }

  const langName = LANG[language] || 'English';
  const locationCtx = location
    ? `The user is in ${[location.city, location.district, location.state].filter(Boolean).join(', ')}, India.`
    : '';

  const system =
    `You are the ResQPaws animal sound expert. Reply ONLY in ${langName}. ` +
    `Explain what an animal sound may indicate, what the user should observe, ` +
    `recommended next steps, and if possible suggest nearby help. ${locationCtx} ` +
    `Use phrases like "possibly", "may indicate", "likely" — never claim certainty. ` +
    `Keep the response under 200 words and use clear sections.`;

  const message =
    `A ${animal} sound was detected with ${confidence}% confidence. ` +
    (soundType ? `The sound type is: ${soundType}. ` : '') +
    `Please explain: 1) What this sound may indicate, 2) What I should observe, ` +
    `3) Recommended next steps, 4) Any nearby help I should seek.`;

  return callGeminiWithFallback({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: message }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
  });
}
