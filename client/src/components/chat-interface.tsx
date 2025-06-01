import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mic, Plus, ChevronRight, Square, Play, Pause } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Message } from "@shared/schema";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Audio Player Component
function AudioPlayer({ audioUrl }: { audioUrl: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-2">
      <Button
        size="sm"
        onClick={togglePlayback}
        className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full p-0"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <div className="flex-1 text-xs text-gray-300">
        <div className="flex justify-between">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
          <div 
            className="bg-white h-1 rounded-full transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
      </div>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
}

export default function ChatInterface() {
  const [message, setMessage] = useState("");
  const [, setLocation] = useLocation();
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // Continuous smooth scrolling during streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollContainer = messagesEndRef.current.closest('main');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [streamingMessage]);

  // Smooth scroll for message updates when not streaming
  useEffect(() => {
    if (!isStreaming && messagesEndRef.current) {
      const scrollContainer = messagesEndRef.current.closest('main');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);

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

  // Send audio message mutation
  const sendAudioMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      // Create audio data URL for immediate display
      const audioDataUrl = `data:audio/webm;base64,${await blobToBase64(audioBlob)}`;
      
      // Optimistically add user audio message to cache first
      const tempUserMessage = {
        id: -Date.now(), // Use negative ID to distinguish temp messages
        content: "Transcribing audio...",
        role: "user" as const,
        audioUrl: audioDataUrl,
        timestamp: new Date(),
      };
      
      queryClient.setQueryData(["/api/messages"], (old: Message[] = []) => [
        ...old,
        tempUserMessage,
      ]);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      setIsStreaming(true);
      setStreamingMessage("");

      const response = await fetch("/api/messages/audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to send audio message");

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
          
          // Remove the temporary message and refresh to get the real data
          queryClient.setQueryData(["/api/messages"], (old: Message[] = []) => 
            old.filter(msg => msg.id !== tempUserMessage.id)
          );
          queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
        }
      }
    },
    onError: () => {
      setIsStreaming(false);
      setStreamingMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      setAudioChunks([]);
      setIsRecording(true);
      setRecordingTime(0);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };
      
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      setMediaRecorder(recorder);
      
      // Start timer (max 30 seconds)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Handle the recorded audio when MediaRecorder stops
  useEffect(() => {
    if (!isRecording && audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      sendAudioMutation.mutate(audioBlob);
      setAudioChunks([]); // Clear chunks after use
    }
  }, [isRecording, audioChunks, sendAudioMutation]);

  const handleMicMouseDown = () => {
    startRecording();
  };

  const handleMicMouseUp = () => {
    stopRecording();
  };

  const handleMicMouseLeave = () => {
    if (isRecording) {
      stopRecording();
    }
  };

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
              className="w-8 h-8 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-gray-300 hover:text-red-400 active:text-red-500 rounded-full p-0 border border-gray-350 hover:border-gray-300 transition-all duration-150 active:scale-95"
              style={{
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.4), 0 6px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)',
                borderColor: '#9ca3af'
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="w-8 h-8 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-gray-300 hover:text-red-400 active:text-red-500 rounded-full p-0 border border-gray-350 hover:border-gray-300 transition-all duration-150 active:scale-95"
              style={{
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.4), 0 6px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)',
                borderColor: '#9ca3af'
              }}
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
                        {msg.audioUrl && (
                          <div className="mb-3">
                            <AudioPlayer audioUrl={msg.audioUrl} />
                          </div>
                        )}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 text-gray-900 placeholder-gray-500"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleSend}
                className="w-10 h-10 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-gray-300 hover:text-red-400 active:text-red-500 rounded-full p-0 border border-gray-350 hover:border-gray-300 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.4), 0 6px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)',
                  borderColor: '#9ca3af'
                }}
                disabled={sendMessageMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
              <div className="relative">
                <Button
                  onMouseDown={handleMicMouseDown}
                  onMouseUp={handleMicMouseUp}
                  onMouseLeave={handleMicMouseLeave}
                  onTouchStart={handleMicMouseDown}
                  onTouchEnd={handleMicMouseUp}
                  className={`w-10 h-10 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 hover:from-gray-600 hover:via-gray-700 hover:to-gray-800 text-gray-300 hover:text-red-400 active:text-red-500 rounded-full p-0 border border-gray-350 hover:border-gray-300 transition-all duration-150 active:scale-95 ${
                    isRecording ? 'animate-pulse border-red-500' : ''
                  }`}
                  style={{
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.4), 0 6px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)',
                    borderColor: isRecording ? '#ef4444' : '#9ca3af'
                  }}
                  disabled={sendAudioMutation.isPending}
                >
                  {isRecording ? <Square className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
                </Button>
                {isRecording && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {recordingTime}s / 30s
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
