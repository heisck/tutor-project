'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type MessageType = 'assistant' | 'user' | 'question';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  time: string;
}

const quickActions = ['Generate question', 'Explain simpler', 'Give summary'];

export default function SessionPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'assistant-intro',
      type: 'assistant',
      content:
        'Welcome back. I reviewed your uploaded material and detected three key concepts to focus on. Which one should we tackle first?',
      time: '09:14',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const canSend = input.trim().length > 0 && !loading;
  const sessionStats = useMemo(
    () => [
      { label: 'Session confidence', value: '81%' },
      { label: 'Questions answered', value: '7' },
      { label: 'Concepts covered', value: '3 / 5' },
    ],
    []
  );

  const addAssistantMessage = (type: MessageType, content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${type}`,
        type,
        content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;

    const userText = input.trim();
    setInput('');

    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-user`,
        type: 'user',
        content: userText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    addAssistantMessage(
      'assistant',
      'Great prompt. Start by isolating the core definition, then map one concrete example. Want me to quiz you next?'
    );
    setLoading(false);
  };

  const handleQuickAction = async (action: string) => {
    if (loading) return;

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));

    if (action === 'Generate question') {
      addAssistantMessage(
        'question',
        'Check your understanding: how would you explain this concept to a beginner in under 60 seconds?'
      );
    } else if (action === 'Explain simpler') {
      addAssistantMessage(
        'assistant',
        'Think of it like a checklist: identify inputs, define the transformation, then confirm the output with one test case.'
      );
    } else {
      addAssistantMessage(
        'assistant',
        'Summary: You understand the definition well, but need one more practice cycle on application and edge cases.'
      );
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live tutor session</p>
            <h1 className="text-lg font-semibold">Adaptive coaching workspace</h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
          >
            Exit session
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.6fr_0.8fr] lg:px-8 lg:py-8">
        <section className="rounded-3xl border border-border/70 bg-background shadow-sm">
          <div className="border-b border-border/70 px-5 py-4 sm:px-6">
            <p className="text-sm font-medium">Conversation</p>
          </div>

          <div className="max-h-[58vh] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: index * 0.03 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <article
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:max-w-[75%] ${
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.type === 'question'
                        ? 'border border-primary/25 bg-primary/10 text-foreground'
                        : 'border border-border bg-muted/40 text-foreground'
                  }`}
                >
                  <p className="leading-relaxed">{message.content}</p>
                  <p className="mt-2 text-[11px] opacity-65">{message.time}</p>
                </article>
              </motion.div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:100ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:200ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/70 px-5 py-4 sm:px-6">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickAction(action)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {action}
                </button>
              ))}
            </div>

            <form onSubmit={handleSend} className="flex gap-3">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask for a deeper explanation, example, or test question…"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-border/70 bg-background p-5 shadow-sm">
            <p className="text-sm font-semibold">Session analytics</p>
            <div className="mt-4 space-y-3">
              {sessionStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/70 bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-border/70 bg-background p-5 shadow-sm">
            <p className="text-sm font-semibold">Current objective</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Explain the target concept clearly, then solve one applied scenario without hints.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
