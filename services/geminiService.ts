import { GoogleGenAI, Type } from "@google/genai";
import { PasswordGenerationOptions } from '../types';

const getAiClient = () => {
    if (!process.env.API_KEY) {
        console.warn("Gemini API Key is missing. AI features will be disabled.");
        return null;
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateMemorablePassphrase = async (topic: string = 'general'): Promise<string[]> => {
    const ai = getAiClient();
    if (!ai) return ["Error: No API Key"];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 5 secure but memorable passphrases related to the topic: "${topic}". 
            Each passphrase should consist of 4 randomly selected words separated by hyphens or spaces. 
            Make them slightly humorous or absurd to aid memory. 
            Return ONLY a JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        const text = response.text;
        if (text) {
            return JSON.parse(text) as string[];
        }
        return [];
    } catch (e) {
        console.error("Gemini generation failed", e);
        return ["Error generating passphrase"];
    }
};

export const analyzePasswordStrength = async (passwordStructure: string): Promise<string> => {
    // Note: We do NOT send the actual password. We send a masked version or description if implemented for privacy.
    // For this demo, we will just ask for general advice based on length and complexity flags, 
    // simulating an analysis without leaking secrets.
    
    const ai = getAiClient();
    if (!ai) return "AI unavailable.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Provide a brief, 1-sentence security tip for a password with this structure: ${passwordStructure}.`,
        });
        return response.text || "Keep passwords long and unique.";
    } catch (e) {
        return "Could not retrieve advice.";
    }
}
