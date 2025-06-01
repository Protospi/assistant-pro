import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, Plus, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [, setLocation] = useLocation();
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // Optimized scrolling behavior
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        const scrollContainer = messagesEndRef.current.closest('main');
        if (scrollContainer) {
          const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 100;
          
          if (isAtBottom || isStreaming) {
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: isStreaming ? 'auto' : 'smooth'
            });
          }
        }
      }
    };

    // Use requestAnimationFrame for smoother scrolling during streaming
    if (isStreaming && streamingMessage) {
      requestAnimationFrame(scrollToBottom);
    } else if (!isStreaming) {
      // Slight delay after streaming ends to ensure DOM is updated
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, streamingMessage, isStreaming]);

  // Send message with streaming
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Optimistically add user message to cache
      const tempUserMessage = {
        id: Date.now(),
        content,
        role: "user" as const,
        timestamp: new Date(),
      };
      
      queryClient.setQueryData(["/api/messages"], (old: Message[] = []) => [
        ...old,
        tempUserMessage,
      ]);

      // Start streaming response
      setIsStreaming(true);
      setStreamingMessage("");

      const response = await fetch("/api/messages/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, role: "user" }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            setStreamingMessage(prev => prev + chunk);
          }
        } finally {
          reader.releaseLock();
          setIsStreaming(false);
          setStreamingMessage("");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: () => {
      setIsStreaming(false);
      setStreamingMessage("");
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
    <div className="h-screen flex flex-col">
      {/* Fixed Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Drops
          </h1>
          <div className="flex space-x-2">
            <Button
              size="sm"
              className="w-8 h-8 bg-gray-900 hover:bg-gray-800 text-white hover:text-blue-400 rounded-full p-0 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="w-8 h-8 bg-gray-900 hover:bg-gray-800 text-white hover:text-blue-400 rounded-full p-0 border border-gray-700 hover:border-gray-600 transition-colors"
              onClick={() => setLocation('/settings')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Messages Area */}
          <div className="space-y-4">
            {/* Default Welcome Message - Always Show */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

            {/* Dynamic Messages */}
            {isLoading ? (
              <div className="text-center text-gray-500">Loading messages...</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.role === "assistant" ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <div className="text-gray-700 prose prose-sm max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({children}) => <h2 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{children}</h2>,
                            h3: ({children}) => <h3 className="text-md font-semibold text-gray-800 mt-3 mb-1">{children}</h3>,
                            strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            ul: ({children}) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                            ol: ({children}) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                            li: ({children}) => <li className="text-gray-700">{children}</li>,
                            p: ({children}) => <p className="text-gray-700 mb-2">{children}</p>,
                            code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
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
            
            {/* Streaming Message */}
            {isStreaming && streamingMessage && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="text-gray-700 prose prose-sm max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h2: ({children}) => <h2 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{children}</h2>,
                      h3: ({children}) => <h3 className="text-md font-semibold text-gray-800 mt-3 mb-1">{children}</h3>,
                      strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      ul: ({children}) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
                      li: ({children}) => <li className="text-gray-700">{children}</li>,
                      p: ({children}) => <p className="text-gray-700 mb-2">{children}</p>,
                      code: ({children}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code>,
                    }}
                  >
                    {streamingMessage}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            
            {(sendMessageMutation.isPending || isStreaming) && !streamingMessage && (
              <div className="text-left text-gray-500">
                Thinking...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Fixed Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-4 flex-shrink-0">
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
                className="w-10 h-10 bg-gray-900 hover:bg-gray-800 text-white hover:text-blue-400 rounded-full p-0 border border-gray-700 hover:border-gray-600 transition-colors"
                disabled={sendMessageMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                className="w-10 h-10 bg-gray-900 hover:bg-gray-800 text-white hover:text-blue-400 rounded-full p-0 border border-gray-700 hover:border-gray-600 transition-colors"
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
