'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';

type MessageType = 'assistant' | 'user' | 'audit';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  time: string;
}

const sessionModes = [
  'Step by step',
  'Voice tutor',
  'Difficult parts only',
  'Exam mode',
  'Quiz now',
  'Flashcards',
];

const quickActions = [
  {
    label: 'Teach step by step',
    mode: 'Step by step',
    responses: [
      {
        type: 'assistant' as const,
        content:
          'Let us slow it down. First anchor the idea in one concrete case, then name the rule, then test the edge case.',
      },
      {
        type: 'audit' as const,
        content: 'Decision: lower cognitive load and keep the explanation concrete before abstraction returns.',
      },
    ],
  },
  {
    label: 'Use a story',
    mode: 'Voice tutor',
    responses: [
      {
        type: 'assistant' as const,
        content:
          'Imagine the concept as a checkpoint system. Every new input must pass the earlier checkpoint before it can move to the next stage.',
      },
      {
        type: 'audit' as const,
        content: 'Decision: story-first explanation selected because analogy recall has been stronger than definition recall.',
      },
    ],
  },
  {
    label: 'Test transfer',
    mode: 'Quiz now',
    responses: [
      {
        type: 'assistant' as const,
        content:
          'Transfer check: if the original example disappeared, how would you still recognize the same principle in a completely different situation?',
      },
      {
        type: 'audit' as const,
        content: 'Decision: challenge understanding with transfer evidence before the concept can advance to mastered.',
      },
    ],
  },
  {
    label: 'Voice recap',
    mode: 'Voice tutor',
    responses: [
      {
        type: 'assistant' as const,
        content:
          'Voice recap ready. I would explain this in three short spoken beats: picture the system, name the rule, then walk through one new case.',
      },
      {
        type: 'audit' as const,
        content: 'Decision: spoken pacing selected because the learner handles short sequential cues better than dense paragraphs.',
      },
    ],
  },
];

const masteryChecks = [
  { label: 'Explain simply', status: 'done' },
  { label: 'Apply to a worked case', status: 'done' },
  { label: 'Transfer to a new case', status: 'next' },
  { label: 'Spot a likely mistake', status: 'locked' },
];

const calibrationSignals = [
  'Learns faster with examples before definitions',
  'Jargon slows recall when introduced too early',
  'Needs shorter explanation bursts after a check question',
];

const coverageLedger = [
  { label: 'ATUs mapped', value: '18 / 18' },
  { label: 'Concepts taught', value: '4 / 6' },
  { label: 'Weak concepts', value: '2' },
  { label: 'Ready to advance', value: 'No' },
];

export default function SessionPage() {
  const [activeMode, setActiveMode] = useState('Step by step');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'assistant-story',
      type: 'assistant',
      content:
        'Welcome back. We are still working on gradient flow. I will start with the picture before the formal definition so the mechanism is easier to hold in mind.',
      time: '09:14',
    },
    {
      id: 'assistant-check',
      type: 'assistant',
      content:
        'Think of it like water choosing the steepest downhill direction. In your own words, what does the model do with that signal at each step?',
      time: '09:15',
    },
    {
      id: 'user-response',
      type: 'user',
      content:
        'It keeps moving toward a smaller error, but I still mix up the update rule with the loss itself.',
      time: '09:16',
    },
    {
      id: 'audit-response',
      type: 'audit',
      content:
        'Classification: partial understanding. The learner has the high-level picture, but the mechanism and objective are still blended together.',
      time: '09:16',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const canSend = input.trim().length > 0 && !loading;

  const addMessage = (type: MessageType, content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${type}-${prev.length}`,
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

    addMessage('user', userText);

    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    addMessage(
      'assistant',
      'You have the overall direction right. The gap is that the loss measures the error, while the update rule uses the gradient to decide how the parameters move.',
    );
    addMessage(
      'audit',
      'Decision: keep the concept in reteach mode. This is not a misconception yet, but mastery evidence is still incomplete.',
    );
    setLoading(false);
  };

  const handleQuickAction = async (action: (typeof quickActions)[number]) => {
    if (loading) return;

    setActiveMode(action.mode);
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));

    action.responses.forEach((response) => addMessage(response.type, response.content));

    setLoading(false);
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="mx-auto max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8">
        <header className="ui-panel sticky top-3 z-30 rounded-[30px] px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="ui-kicker">Live tutor session</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Guided mastery cockpit
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Current concept: gradient flow · Goal: separate objective function from update rule.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="ui-chip">Transfer gate pending</span>
              <span className="ui-chip hidden sm:inline-flex">Evidence mode on</span>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/10"
              >
                Exit session
              </Link>
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_340px]">
          <section className="min-w-0 space-y-4">
            <article className="ui-panel ui-mesh overflow-hidden rounded-[34px] p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="ui-kicker">Tutor state</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                    The system is reteaching before it trusts the next jump.
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
                    The learner understands the direction of optimization, but still blends the objective with
                    the update mechanism. That means more explanation diversity before a fresh transfer check.
                  </p>
                </div>

                <div className="ui-panel-muted rounded-[24px] px-4 py-3">
                  <p className="ui-kicker">Active mode</p>
                  <p className="mt-2 text-lg font-semibold">{activeMode}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {sessionModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setActiveMode(mode)}
                    className={`rounded-full border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-all ${
                      mode === activeMode
                        ? 'border-primary/25 bg-primary/12 text-primary'
                        : 'border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </article>

            <article className="ui-panel overflow-hidden rounded-[34px]">
              <div className="border-b border-white/8 px-6 py-5 sm:px-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="ui-kicker">Conversation</p>
                    <p className="mt-2 text-lg font-semibold">Tutor decisions and learner evidence</p>
                  </div>
                  <div className="ui-panel-muted rounded-full px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-secondary">
                      Reteach branch active
                    </span>
                  </div>
                </div>
              </div>

              <div className="max-h-[58vh] space-y-4 overflow-y-auto px-5 py-6 sm:px-7">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: index * 0.03 }}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <article
                      className={`max-w-[88%] overflow-hidden rounded-[26px] px-4 py-4 text-sm shadow-[0_18px_40px_rgb(4_10_24_/_0.14)] sm:max-w-[78%] ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-primary to-cyan-300 text-primary-foreground'
                          : message.type === 'audit'
                            ? 'border border-secondary/20 bg-secondary/10 text-foreground'
                            : 'ui-panel-muted text-foreground'
                      }`}
                    >
                      <p className="break-words leading-7">{message.content}</p>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.14em] opacity-65">{message.time}</p>
                    </article>
                  </motion.div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="ui-panel-muted rounded-[24px] px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:100ms]" />
                        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:200ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-white/8 px-5 py-5 sm:px-7">
                <div className="mb-4 flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickAction(action)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-white/10 disabled:opacity-60"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSend} className="ui-panel-muted flex min-w-0 gap-3 rounded-[24px] p-3">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask for a simpler explanation, request a story, or demand a transfer check..."
                    className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="rounded-[18px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </div>
            </article>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="ui-panel rounded-[30px] p-5">
              <p className="ui-kicker">Mastery gate</p>
              <div className="mt-4 space-y-3">
                {masteryChecks.map((check) => (
                  <div key={check.label} className="ui-panel-muted rounded-[22px] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{check.label}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          check.status === 'done'
                            ? 'bg-accent/12 text-accent'
                            : check.status === 'next'
                              ? 'bg-primary/12 text-primary'
                              : 'bg-white/8 text-muted-foreground'
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="ui-panel rounded-[30px] p-5">
              <p className="ui-kicker">Calibration signals</p>
              <div className="mt-4 space-y-3">
                {calibrationSignals.map((signal) => (
                  <div key={signal} className="ui-panel-muted rounded-[22px] p-4">
                    <p className="text-sm leading-6 text-muted-foreground">{signal}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="ui-panel rounded-[30px] p-5">
              <p className="ui-kicker">Coverage ledger</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {coverageLedger.map((item) => (
                  <div key={item.label} className="ui-panel-muted rounded-[22px] p-4">
                    <p className="ui-kicker">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-primary/20 bg-primary/10 p-5 shadow-[0_20px_38px_rgb(59_208_221_/_0.12)]">
              <p className="ui-kicker text-primary">Next tutor decision</p>
              <p className="mt-3 text-sm leading-7 text-foreground/92">
                Separate the objective function from the update rule with one fresh example, then run a transfer
                check without hints.
              </p>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
