import OpenAI from "openai";
import fs from "fs";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateChatResponse(userMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Indy, Pedro's AI digital assistant for his portfolio website called 'Drops'. You help visitors explore Pedro's professional life, including his curriculum & skills, working experience, projects, and booking appointments. Be helpful, friendly, and professional. Keep responses concise, maximum 100 words. Format your responses in markdown with proper headings (##), bullet points (-), bold text (**bold**), and emojis for better readability."
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

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    // Write buffer to temporary file
    const tempFilePath = `/tmp/audio_${Date.now()}.webm`;
    fs.writeFileSync(tempFilePath, audioBuffer);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      response_format: "text",
    });

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    return transcription;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    throw new Error("Failed to transcribe audio");
  }
}

export async function* generateStreamingChatResponse(userMessage: string): AsyncGenerator<string, void, unknown> {
  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are Indy, Pedro's AI digital assistant for his portfolio website called 'Drops'. You help visitors explore Pedro's professional life, including his curriculum & skills, working experience, projects, and booking appointments. Be helpful, friendly, and professional. Keep responses concise, maximum 100 words. Format your responses in markdown with proper headings (##), bullet points (-), bold text (**bold**), and emojis for better readability."
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 150,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate response from AI assistant");
  }
}