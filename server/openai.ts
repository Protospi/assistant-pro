import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateChatResponse(userMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Indy, Pedro's AI digital assistant for his portfolio website called 'Drops'. You help visitors explore Pedro's professional life, including his curriculum & skills, working experience, projects, and booking appointments. Be helpful, friendly, and professional. Keep responses concise, maximum 100 words."
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response at the moment.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate response from AI assistant");
  }
}