'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

type MessageType = 'explanation' | 'question' | 'user-answer';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
}

export default function SessionPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'explanation',
      content:
        'Hello! I\'m your AI tutor. I\'ve analyzed your learning material. What would you like to learn about today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user-answer',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'explanation',
      content:
        'This is a great question! Let me break this down step by step for you. First, we need to understand the core concept...',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setLoading(false);
  };

  const handleGetQuestion = async () => {
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const question: Message = {
      id: Date.now().toString(),
      type: 'question',
      content:
        'Based on what we\'ve discussed, can you explain the difference between these two concepts?',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, question]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">Tutoring Session</h1>
          <button className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            End Session
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {messages.map((message, idx) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className={`flex ${
                  message.type === 'user-answer' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-2xl rounded-2xl px-6 py-4 ${
                    message.type === 'user-answer'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted text-foreground rounded-bl-none'
                  }`}
                >
                  <div className="space-y-2">
                    {message.type === 'question' && (
                      <p className="text-sm font-semibold text-accent">Question for you:</p>
                    )}
                    <p className="leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-60 mt-2">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-muted rounded-2xl rounded-bl-none px-6 py-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-background/80 backdrop-blur-sm px-6 py-6">
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleGetQuestion}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-muted text-foreground hover:border-primary border border-border transition-all text-sm font-medium disabled:opacity-50"
              >
                Get Question
              </button>
              <button
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-muted text-foreground hover:border-primary border border-border transition-all text-sm font-medium disabled:opacity-50"
              >
                Clarify
              </button>
              <button
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-muted text-foreground hover:border-primary border border-border transition-all text-sm font-medium disabled:opacity-50"
              >
                Summary
              </button>
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question or share your answer..."
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
              >
                Send
              </motion.button>
            </form>

            <p className="text-xs text-muted-foreground text-center">
              Your learning is personalized. The AI adjusts explanations based on your responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
