import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, Plus, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch all messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, role: "user" }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const handleSend = () => {
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Drops
          </h1>
          <div className="flex space-x-2">
            <Button
              size="sm"
              className="w-8 h-8 bg-gray-900 hover:bg-gray-800 text-white rounded-full p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="w-8 h-8 bg-gray-900 hover:bg-gray-800 text-white rounded-full p-0"
              onClick={() => setLocation('/settings')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Messages Area */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center text-gray-500">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Welcome to Pedro's Website Agent!
                    </h2>
                    <p className="text-gray-700 mb-4">Hey there, I'm Indy 👋</p>
                    <p className="text-gray-700 mb-4">
                      I'm an AI digital assistant here to help you explore all things about Pedro's professional life. Feel free to ask me about:
                    </p>

                    <ul className="space-y-2 mb-4">
                      <li className="flex items-center text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        Curriculum & Skills 📋
                      </li>
                      <li className="flex items-center text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        Working Experience 💼
                      </li>
                      <li className="flex items-center text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        Projects 🚀
                      </li>
                      <li className="flex items-center text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                        Booking Appointments 📅
                      </li>
                    </ul>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-600">
                        Enjoy your visit, and let me know how I can help!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.role === "assistant" ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <p className="text-gray-700">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <div className="bg-black text-white rounded-lg p-4 max-w-xs lg:max-w-md">
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {sendMessageMutation.isPending && (
              <div className="text-center text-gray-500">
                Sending message...
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Explore my work"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleSend}
                className="w-10 h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-full p-0"
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                className="w-10 h-10 bg-gray-900 hover:bg-gray-800 text-white rounded-full p-0"
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
