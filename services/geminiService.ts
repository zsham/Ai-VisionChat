
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { ChatMessage, ChatPart, GroundingSource } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Converts a base64 string to a GoogleGenAI.Part object
const fileToGenerativePart = (base64: string, mimeType: string): ChatPart => {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
};

export const sendMessageToGemini = async (
    history: ChatMessage[],
    message: string,
    image?: { base64: string; mimeType: string }
) => {
    try {
        const userParts: ChatPart[] = [{ text: message }];
        if (image) {
            userParts.push(fileToGenerativePart(image.base64, image.mimeType));
        }

        const contents = [
            ...history.map(msg => ({
                role: msg.role,
                parts: msg.parts.map(part => {
                    if (part.text) return { text: part.text };
                    if (part.inlineData) return { inlineData: part.inlineData };
                    return {};
                }),
            })),
            { role: 'user', parts: userParts },
        ];
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: contents,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const responseText = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

        const groundingSources: GroundingSource[] = groundingChunks
            ? groundingChunks
                .filter((chunk: any) => chunk.web && chunk.web.uri && chunk.web.title)
                .map((chunk: any) => ({
                    uri: chunk.web.uri,
                    title: chunk.web.title,
                }))
            : [];
        
        // Remove duplicate sources
        const uniqueSources = Array.from(new Map(groundingSources.map(item => [item.uri, item])).values());


        return {
            text: responseText,
            sources: uniqueSources,
        };

    } catch (error) {
        console.error("Error sending message to Gemini:", error);
        if (error instanceof Error) {
            return { error: error.message };
        }
        return { error: "An unknown error occurred." };
    }
};
