import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { generateChatResponse, generateStreamingChatResponse, transcribeAudio } from "./openai";
import multer from "multer";
import { Request } from "express";

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
          role: "assistant"
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
        role: "assistant"
      });
      
      res.json({ userMessage, assistantMessage });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
