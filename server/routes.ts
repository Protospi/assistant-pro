import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { generateChatResponse, generateStreamingChatResponse, transcribeAudio } from "./openai";
import multer from "multer";
import { Request } from "express";

// Configure multer for handling audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all messages
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Send a new message and get AI response with streaming
  app.post("/api/messages/stream", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Save user message
      const userMessage = await storage.createMessage(validatedData);
      
      // Set up streaming response
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      let fullResponse = "";
      
      try {
        // Stream AI response
        for await (const chunk of generateStreamingChatResponse(validatedData.content)) {
          fullResponse += chunk;
          res.write(chunk);
        }
        
        // Save complete AI response
        await storage.createMessage({
          content: fullResponse,
          role: "assistant",
          audioUrl: null
        });
        
        res.end();
      } catch (streamError) {
        console.error("Streaming error:", streamError);
        res.write("\n\nI'm sorry, I encountered an error while generating the response.");
        res.end();
      }
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Send a new message and get AI response (non-streaming fallback)
  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Save user message
      const userMessage = await storage.createMessage(validatedData);
      
      // Generate AI response
      const aiResponse = await generateChatResponse(validatedData.content);
      
      // Save AI response
      const assistantMessage = await storage.createMessage({
        content: aiResponse,
        role: "assistant",
        audioUrl: null
      });
      
      res.json({ userMessage, assistantMessage });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Handle audio message upload and transcription
  app.post("/api/messages/audio", upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      // Transcribe the audio
      const transcribedText = await transcribeAudio(req.file.buffer);
      
      // Create a data URL for the audio to store with the message
      const audioDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      
      // Save user message with audio
      const userMessage = await storage.createMessage({
        content: transcribedText,
        role: "user",
        audioUrl: audioDataUrl
      });

      // Set up streaming response for AI
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      let fullResponse = "";
      
      try {
        // Stream AI response based on transcribed text
        for await (const chunk of generateStreamingChatResponse(transcribedText)) {
          fullResponse += chunk;
          res.write(chunk);
        }
        
        // Save complete AI response
        await storage.createMessage({
          content: fullResponse,
          role: "assistant",
          audioUrl: null
        });
        
        res.end();
      } catch (streamError) {
        console.error("Streaming error:", streamError);
        res.write("\n\nI'm sorry, I encountered an error while generating the response.");
        res.end();
      }
    } catch (error) {
      console.error("Error processing audio message:", error);
      res.status(500).json({ error: "Failed to process audio message" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
