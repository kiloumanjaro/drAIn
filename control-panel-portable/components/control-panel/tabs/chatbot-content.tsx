'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';

interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export function ChatbotView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      content:
        "Hello! I'm your drainage infrastructure assistant. I can help you with questions about pipes, inlets, outlets, storm drains, and reports. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const conversationHistory = messages
        .slice(-6)
        .map(
          (msg) =>
            `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        );

      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, history: conversationHistory }),
      });

      const payload = (await res.json()) as { text?: string; error?: string };

      if (!res.ok || !payload.text) {
        throw new Error(payload.error ?? `Request failed (${res.status})`);
      }

      const botMessage: Message = {
        role: 'bot',
        content: payload.text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Chatbot request error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to get response: ${errorMessage}`);

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content:
            'I apologize, but I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* Overlapping Source Icons - Absolutely Positioned */}
      <div className="absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center">
        <Avatar className="h-12 w-12 cursor-pointer border-2 border-white shadow-lg transition-transform hover:scale-110">
          <AvatarFallback className="overflow-hidden p-0">
            <Image
              src="/images/drain.png"
              alt="Drain"
              width={48}
              height={48}
              className="object-cover"
            />
          </AvatarFallback>
        </Avatar>
        <Avatar className="z-10 -ml-3 h-12 w-12 cursor-pointer border-2 border-white shadow-lg transition-transform hover:scale-110">
          <AvatarFallback className="overflow-hidden p-0">
            <Image
              src="/images/google.png"
              alt="Google"
              width={48}
              height={48}
              className="object-cover"
            />
          </AvatarFallback>
        </Avatar>
        <Avatar className="z-20 -ml-3 h-12 w-12 cursor-pointer border-2 border-white shadow-lg transition-transform hover:scale-110">
          <AvatarFallback className="overflow-hidden p-0">
            <Image
              src="/images/gemini.png"
              alt="Gemini"
              width={48}
              height={48}
              className="object-cover"
            />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Messages Area with Transparent Gradient Background */}
      <ScrollArea className="flex-1 bg-transparent p-4 pt-20">
        <div className="space-y-6 pb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] px-5 py-3 break-words ${
                  msg.role === 'user'
                    ? 'rounded-2xl bg-blue-500 text-white'
                    : 'rounded-2xl border border-gray-300 bg-white text-gray-800'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`mt-1 text-[10px] ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex max-w-[80%] items-center gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2 shadow-md">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm text-gray-800">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Error Display */}
      {error && (
        <div className="px-4 pb-2">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 pr-2.5">
        <div className="relative flex items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask, Search or Chat..."
            disabled={loading}
            className="h-12 flex-1 rounded-lg border-[#d1d5dc] bg-white pr-16 text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            size="icon"
            className="absolute right-2 h-9 w-9"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
