import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) throw new Error("GROQ_API_KEY is required");

export const groq = new Groq({ apiKey });

export const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function groqChat(systemPrompt: string, userMessage: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 300,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}
