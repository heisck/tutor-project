'use client';

import React from 'react';
import type {
  AuthenticatedUser,
  DocumentListItemResponse,
  MiniCalibrationInput,
  StudySessionMode,
  StudySessionStateResponse,
  TutorStreamEvent,
} from '@ai-tutor-pwa/shared';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronRight,
  Lightbulb,
  LoaderCircle,
  MessageSquare,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { cn, formatRelativeTime } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  content: string;
  id: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  streaming?: boolean;
}

const DEFAULT_CALIBRATION: MiniCalibrationInput = {
  academicLevel: 'undergraduate',
  explanationStartPreference: 'example_first',
  sessionGoal: 'deep_understanding',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findCurrentSegment(state: StudySessionStateResponse) {
  return (
    state.teachingPlan.segments.find((s) => s.id === state.session.currentSegmentId) ??
    state.teachingPlan.segments[0]
  );
}

// ─── Markdown renderer (no dependencies) ─────────────────────────────────────

function renderMarkdownLine(line: string) {
  // Inline: replace **bold**, *italic*, `code` then render
  const parts: (string | React.ReactElement)[] = [];
  let cursor = 0;
  const patterns: [RegExp, string][] = [
    [/\*\*(.+?)\*\*/g, 'strong'],
    [/\*(.+?)\*/g, 'em'],
    [/`(.+?)`/g, 'code'],
  ];

  // Build a flat list of tokens
  interface Token {
    start: number;
    end: number;
    tag: string;
    content: string;
  }
  const tokens: Token[] = [];
  for (const [re, tag] of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      tokens.push({ start: m.index, end: m.index + m[0].length, tag, content: m[1] });
    }
  }
  tokens.sort((a, b) => a.start - b.start);

  // De-overlap: drop tokens that overlap with previous
  const clean: Token[] = [];
  let last = 0;
  for (const t of tokens) {
    if (t.start >= last) {
      clean.push(t);
      last = t.end;
    }
  }

  for (const t of clean) {
    if (cursor < t.start) parts.push(line.slice(cursor, t.start));
    if (t.tag === 'strong') parts.push(<strong key={`s${t.start}`}>{t.content}</strong>);
    else if (t.tag === 'em') parts.push(<em key={`e${t.start}`}>{t.content}</em>);
    else parts.push(<code key={`c${t.start}`}>{t.content}</code>);
    cursor = t.end;
  }
  if (cursor < line.length) parts.push(line.slice(cursor));

  return parts;
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i}>{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h3 key={i}>{line.slice(2)}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: React.ReactElement[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i}>{renderMarkdownLine(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul${i}`}>{items}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: React.ReactElement[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{renderMarkdownLine(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol${i}`}>{items}</ol>);
      continue;
    } else if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i}>
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
    } else if (line.trim() === '') {
      // skip blank lines (margin handled by CSS)
    } else {
      elements.push(<p key={i}>{renderMarkdownLine(line)}</p>);
    }

    i++;
  }

  return <div className="ai-message">{elements}</div>;
}

// ─── Session stream reader (progressive) ─────────────────────────────────────

async function consumeTutorStream(
  stream: ReadableStream<Uint8Array>,
  onChunk: (events: TutorStreamEvent[]) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  function flush() {
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    const events: TutorStreamEvent[] = [];
    for (const frame of frames) {
      const trimmed = frame.trim();
      if (!trimmed) continue;
      const dataLine = trimmed.split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) continue;
      try {
        events.push(JSON.parse(dataLine.slice(6)) as TutorStreamEvent);
      } catch {
        // ignore malformed frames
      }
    }
    if (events.length > 0) onChunk(events);
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    flush();
  }

  buffer += decoder.decode();
  flush();
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex gap-1.5 items-center py-1">
      {[0, 150, 300].map((delay) => (
        <div
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-cream-muted animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-dim border border-surface-border flex items-center justify-center mr-3 mt-1">
          <Sparkles size={13} className="text-amber" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[78%] rounded-xl px-4 py-3 shadow-sm',
          isUser
            ? 'bg-amber text-ink rounded-br-sm'
            : 'bg-surface border border-surface-border rounded-bl-sm',
        )}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed font-body">{message.content}</p>
        ) : (
          <div className="text-sm">
            {message.streaming && message.content === '' ? (
              <ThinkingDots />
            ) : (
              <MarkdownContent content={message.content} />
            )}
            {message.streaming && message.content !== '' && (
              <span className="inline-block w-0.5 h-4 bg-amber animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
        <p
          className={cn(
            'label-mono text-xs mt-1.5',
            isUser ? 'text-ink/50' : 'text-cream-muted',
          )}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

function MasteryBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="label-mono text-xs text-cream-muted">{label}</span>
        <span className="label-mono text-xs text-cream">
          {value}/{max}
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function SessionPageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 text-cream-muted">
        <LoaderCircle className="animate-spin" size={18} />
        <span className="label-mono text-sm">Loading workspace…</span>
      </div>
    </div>
  );
}

// ─── Launcher ─────────────────────────────────────────────────────────────────

function SessionLauncher({
  documents,
  selectedDocumentId,
  launching,
  error,
  onSelectDocument,
  onStart,
  onUpload,
}: {
  documents: DocumentListItemResponse[];
  selectedDocumentId: string;
  launching: boolean;
  error: string | null;
  onSelectDocument: (id: string) => void;
  onStart: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header - minimal */}
        <div className="mb-8">
          <h1 className="display-md text-cream mb-2">What would you like to study?</h1>
          <p className="text-cream-muted text-sm" style={{ fontFamily: 'var(--font-source-serif)' }}>
            Pick a document to begin learning.
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 font-mono">{error}</p>
          </div>
        )}

        {/* Document list */}
        <div className="space-y-3">
          {documents.length === 0 ? (
            <div className="text-center py-12 space-y-4 px-6">
              <div className="w-12 h-12 rounded-xl bg-surface-hover border border-surface-border flex items-center justify-center mx-auto">
                <Upload size={20} className="text-cream-muted" />
              </div>
              <p className="text-cream-muted text-sm" style={{ fontFamily: 'var(--font-source-serif)' }}>
                No documents ready yet. Upload and process a file first.
                </p>
                <button className="btn-primary text-sm" onClick={onUpload}>
                  Upload material
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <button
                    key={doc.documentId}
                    type="button"
                    onClick={() => onSelectDocument(doc.documentId)}
                    className={cn(
                      'w-full text-left rounded-lg border px-4 py-3.5 transition-all',
                      selectedDocumentId === doc.documentId
                        ? 'border-amber bg-amber-dim'
                        : 'border-surface-border bg-surface hover:border-amber/40 hover:bg-surface-hover',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className="text-sm text-cream truncate"
                          style={{ fontFamily: 'var(--font-source-serif)' }}
                        >
                          {doc.fileName}
                        </p>
                        <p className="label-mono text-xs text-cream-muted mt-0.5">
                          {formatRelativeTime(doc.updatedAt)}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {selectedDocumentId === doc.documentId && (
                          <span className="badge badge-amber">Selected</span>
                        )}
                        <ChevronRight size={14} className="text-cream-muted" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
        </div>

        {/* Start button - simple */}
        <div className="mt-8">
          <button
            className="btn-primary w-full justify-center py-3"
            disabled={documents.length === 0 || launching}
            onClick={onStart}
          >
            {launching ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <Play size={16} />
                Start learning
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Active session UI ────────────────────────────────────────────────────────

function ActiveSession({
  sessionState,
  messages,
  input,
  asking,
  submittingAnswer,
  requestingTurn,
  voiceCommandBusy,
  audioUrl,
  error,
  onInputChange,
  onSubmitAnswer,
  onAskQuestion,
  onNextTurn,
  onSendCommand,
  onAudioError,
  onBack,
  messagesEndRef,
}: {
  sessionState: StudySessionStateResponse;
  messages: ChatMessage[];
  input: string;
  asking: boolean;
  submittingAnswer: boolean;
  requestingTurn: boolean;
  voiceCommandBusy: boolean;
  audioUrl: string | null;
  error: string | null;
  onInputChange: (v: string) => void;
  onSubmitAnswer: (v: string) => void;
  onAskQuestion: (v: string) => void;
  onNextTurn: () => void;
  onSendCommand: (
    cmd: 'pause' | 'continue' | 'slower' | 'repeat' | 'simpler' | 'example' | 'go_back' | 'test_me',
  ) => void;
  onAudioError: () => void;
  onBack: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  const currentSegment = useMemo(
    () => findCurrentSegment(sessionState),
    [sessionState],
  );
  const busy = asking || submittingAnswer;

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmitAnswer(input);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Session header - minimal */}
      <div className="shrink-0 border-b border-surface-border bg-surface px-5 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1
            className="text-sm font-semibold text-cream truncate"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            {currentSegment?.conceptTitle ?? 'Study Session'}
          </h1>
          <p className="label-mono text-xs text-cream-muted mt-0.5">
            Step {sessionState.modeContext.queueCursor + 1} of {sessionState.modeContext.queueSize}
          </p>
        </div>
        <button
          className="btn-ghost text-xs px-3 py-1.5 shrink-0"
          onClick={onBack}
        >
          ← Back
        </button>
      </div>

      {/* Main content: chat + sidebar */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Error */}
          {error && (
            <div className="shrink-0 mx-5 mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-400 font-mono">{error}</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {messages.map((msg) => (
              <ChatMessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area - simplified */}
          <div className="shrink-0 border-t border-surface-border bg-surface/80 backdrop-blur-sm px-5 py-4 space-y-2">
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm py-2.5"
                placeholder="Type your answer…"
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKey}
              />
              <button
                className="btn-primary px-4 py-2.5 text-sm"
                disabled={busy || input.trim().length === 0}
                onClick={() => onSubmitAnswer(input)}
              >
                {submittingAnswer ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                <span className="hidden sm:inline">Submit</span>
              </button>
            </div>

            {/* Minimal helper buttons - on hover only */}
            <div className="flex flex-wrap gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
              <button
                className="btn-ghost text-xs px-2.5 py-1"
                disabled={voiceCommandBusy}
                onClick={() => onSendCommand('simpler')}
                title="Make the explanation simpler"
              >
                <Lightbulb size={11} />
                Simpler
              </button>
              <button
                className="btn-ghost text-xs px-2.5 py-1"
                disabled={voiceCommandBusy}
                onClick={() => onSendCommand('example')}
                title="Show an example"
              >
                <Sparkles size={11} />
                Example
              </button>
              <button
                className="btn-ghost text-xs px-2.5 py-1"
                disabled={voiceCommandBusy}
                onClick={() => onSendCommand('repeat')}
                title="Repeat the question"
              >
                <RotateCcw size={11} />
                Repeat
              </button>
              <button
                className="btn-ghost text-xs px-2.5 py-1"
                disabled={requestingTurn}
                onClick={onNextTurn}
                title="Skip to next concept"
              >
                {requestingTurn ? (
                  <LoaderCircle size={11} className="animate-spin" />
                ) : (
                  <ChevronRight size={11} />
                )}
                Next
              </button>
            </div>

            {audioUrl && (
              <audio
                className="w-full h-8"
                controls
                src={audioUrl}
                onError={onAudioError}
              />
            )}
          </div>
        </div>

        {/* Right panel: session context - HIDDEN for simplified UX */}
        <div className="hidden w-72 xl:w-80 shrink-0 flex-col border-l border-surface-border bg-surface/50 overflow-y-auto">
          <div className="p-4 space-y-5">
            {/* Current concept */}
            <section>
              <p className="label-mono text-xs text-cream-muted mb-3">Current concept</p>
              <div className="card-hover card p-4 rounded-lg space-y-2">
                <p
                  className="text-sm font-semibold text-cream"
                  style={{ fontFamily: 'var(--font-fraunces)' }}
                >
                  {currentSegment?.conceptTitle ?? '—'}
                </p>
                <p className="label-mono text-xs text-cream-muted">
                  {currentSegment?.explanationStrategy?.replaceAll('_', ' ') ?? '—'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="label-mono text-xs text-cream-muted">
                    Step {sessionState.modeContext.queueCursor + 1} of{' '}
                    {sessionState.modeContext.queueSize}
                  </span>
                  {sessionState.modeContext.degradedReason && (
                    <span className="badge badge-amber">{sessionState.modeContext.degradedReason}</span>
                  )}
                </div>
              </div>
            </section>

            {/* Coverage */}
            <section>
              <p className="label-mono text-xs text-cream-muted mb-3">Coverage</p>
              <div className="space-y-3">
                <MasteryBar
                  label="Assessed"
                  value={sessionState.summary.coverageSummary.assessed}
                  max={sessionState.teachingPlan.segments.length}
                />
                <MasteryBar
                  label="Taught"
                  value={sessionState.atuAuditSummary.taughtCount}
                  max={sessionState.atuAuditSummary.totalCount}
                />
                <MasteryBar
                  label="Checked"
                  value={sessionState.atuAuditSummary.checkedCount}
                  max={sessionState.atuAuditSummary.totalCount}
                />
              </div>
            </section>

            {/* Voice controls */}
            <section>
              <p className="label-mono text-xs text-cream-muted mb-3">Voice controls</p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { cmd: 'repeat' as const, icon: <RotateCcw size={11} />, label: 'Repeat' },
                    { cmd: 'simpler' as const, icon: <Lightbulb size={11} />, label: 'Simpler' },
                    { cmd: 'test_me' as const, icon: <MessageSquare size={11} />, label: 'Test me' },
                    { cmd: 'slower' as const, icon: <Pause size={11} />, label: 'Slower' },
                    { cmd: 'example' as const, icon: <Sparkles size={11} />, label: 'Example' },
                  ] as const
                ).map(({ cmd, icon, label }) => (
                  <button
                    key={cmd}
                    className="btn-ghost text-xs px-2.5 py-1"
                    disabled={voiceCommandBusy}
                    onClick={() => onSendCommand(cmd)}
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Quick actions */}
            <section>
              <p className="label-mono text-xs text-cream-muted mb-3">Quick actions</p>
              <div className="space-y-1.5">
                <button
                  className="btn-secondary text-xs w-full justify-center py-2"
                  onClick={() =>
                    onAskQuestion(
                      `Give me a hint about ${currentSegment?.conceptTitle ?? 'the current concept'}.`,
                    )
                  }
                >
                  <Lightbulb size={12} />
                  Get hint
                </button>
                <button
                  className="btn-ghost text-xs w-full justify-center py-2"
                  onClick={() =>
                    onAskQuestion(
                      `Ask me a follow-up question to check my understanding of ${currentSegment?.conceptTitle ?? 'this concept'}.`,
                    )
                  }
                >
                  <MessageSquare size={12} />
                  Ask follow-up
                </button>
              </div>
            </section>

            {/* Teaching plan */}
            <section>
              <p className="label-mono text-xs text-cream-muted mb-3">Teaching plan</p>
              <div className="space-y-1">
                {sessionState.teachingPlan.segments.slice(0, 8).map((seg) => (
                  <div
                    key={seg.id}
                    className={cn(
                      'rounded-lg border px-3 py-2 transition-colors',
                      seg.id === sessionState.session.currentSegmentId
                        ? 'border-amber bg-amber-dim'
                        : 'border-surface-border',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'label-mono text-xs shrink-0',
                          seg.id === sessionState.session.currentSegmentId
                            ? 'text-amber'
                            : 'text-cream-muted',
                        )}
                      >
                        {seg.ordinal + 1}
                      </span>
                      <p
                        className={cn(
                          'text-xs truncate',
                          seg.id === sessionState.session.currentSegmentId
                            ? 'text-cream'
                            : 'text-cream-muted',
                        )}
                        style={{ fontFamily: 'var(--font-source-serif)' }}
                      >
                        {seg.conceptTitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function SessionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  const documentIdParam = searchParams.get('documentId');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [, setUser] = useState<AuthenticatedUser | null>(null);
  const [documents, setDocuments] = useState<DocumentListItemResponse[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const mode: StudySessionMode = 'full';
  const [calibration, setCalibration] = useState<MiniCalibrationInput>(DEFAULT_CALIBRATION);

  const [activeSession, setActiveSession] = useState<StudySessionStateResponse | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const [pageError, setPageError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [asking, setAsking] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [requestingTurn, setRequestingTurn] = useState(false);
  const [voiceCommandBusy, setVoiceCommandBusy] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const readyDocuments = useMemo(
    () => documents.filter((d) => d.processingStatus === 'complete'),
    [documents],
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup media + audio on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Initialize
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [session, docs] = await Promise.all([api.getSession(), api.listDocuments()]);
        if (cancelled) return;
        setUser(session.user);
        setDocuments(docs);

        try {
          const profile = await api.getProfile();
          if (!cancelled && profile.level) {
            setCalibration((c) => ({ ...c, academicLevel: profile.level! }));
          }
        } catch { /* profile optional */ }

        const defaultDoc =
          documentIdParam ??
          docs.find((d) => d.processingStatus === 'complete')?.documentId ??
          '';
        if (!cancelled) setSelectedDocumentId(defaultDoc);

        if (sessionIdParam) {
          await loadSessionById(sessionIdParam);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.push('/signin');
          return;
        }
        setPageError(err instanceof Error ? err.message : 'Failed to load workspace.');
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    void init();
    return () => { cancelled = true; };
  }, []); // intentionally run once on mount

  async function loadSessionById(id: string) {
    const state = await api.getSessionState(id);
    setActiveSession(state);
    setMessages([]);
    await triggerTutorTurn(id, state);
  }

  const triggerTutorTurn = useCallback(
    async (sessionId: string, knownState?: StudySessionStateResponse) => {
      setRequestingTurn(true);
      const streamingId = `stream-${Date.now()}`;

      // Add a placeholder "streaming" message
      setMessages((prev) => [
        ...prev,
        { id: streamingId, role: 'assistant', content: '', timestamp: new Date(), streaming: true },
      ]);

      try {
        const stream = await api.startTutorSession(sessionId);
        let fullContent = '';

        await consumeTutorStream(stream, (events) => {
          const msgEvent = events.find((e) => e.type === 'message');
          if (msgEvent?.type === 'message') {
            fullContent = msgEvent.data.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingId
                  ? { ...m, content: fullContent }
                  : m,
              ),
            );
          }
        });

        // Mark done
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamingId
              ? { ...m, streaming: false, content: fullContent || '' }
              : m,
          ),
        );

        // If no content arrived, set intro
        if (!fullContent && knownState) {
          const seg = findCurrentSegment(knownState);
          const intro = seg
            ? `Session ready. Starting with **${seg.conceptTitle}**.`
            : 'Session ready. Ask a question to begin.';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingId ? { ...m, content: intro, streaming: false } : m,
            ),
          );
        }

        const nextState = await api.getSessionState(sessionId);
        setActiveSession(nextState);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== streamingId));
        setPageError(err instanceof Error ? err.message : 'Failed to load tutor turn.');
      } finally {
        setRequestingTurn(false);
      }
    },
    [],
  );

  async function startSession() {
    if (!selectedDocumentId) {
      setPageError('Select a document before starting.');
      return;
    }
    setLaunching(true);
    setPageError(null);
    try {
      const started = await api.startStudySession(selectedDocumentId, { calibration, mode });
      router.replace(`/session?sessionId=${started.session.id}`);
      await loadSessionById(started.session.id);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to start session.');
    } finally {
      setLaunching(false);
    }
  }

  async function submitAnswer(answer: string) {
    if (!activeSession) return;
    const trimmed = answer.trim();
    if (!trimmed) return;

    const seg = findCurrentSegment(activeSession);
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-user`, role: 'user', content: trimmed, timestamp: new Date() },
    ]);
    setInput('');
    setSubmittingAnswer(true);
    setPageError(null);

    try {
      await api.evaluateTutorResponse(activeSession.session.id, seg?.id ?? '', trimmed);
      const nextState = await api.getSessionState(activeSession.session.id);
      setActiveSession(nextState);
      await triggerTutorTurn(activeSession.session.id, nextState);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to submit answer.');
    } finally {
      setSubmittingAnswer(false);
    }
  }

  async function askQuestion(question: string, appendUserMsg = true) {
    if (!activeSession) return;
    const trimmed = question.trim();
    if (!trimmed) return;

    if (appendUserMsg) {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-q`, role: 'user', content: trimmed, timestamp: new Date() },
      ]);
    }
    setInput('');
    setAsking(true);
    setPageError(null);

    try {
      const resp = await api.askTutorQuestion(activeSession.session.id, trimmed);
      const answer = resp.understandingCheck
        ? `${resp.answer}\n\n*Check yourself:* ${resp.understandingCheck}`
        : resp.answer;

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: 'assistant', content: answer, timestamp: new Date() },
      ]);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Tutor could not answer.');
    } finally {
      setAsking(false);
    }
  }

  async function sendVoiceCommand(
    cmd: 'pause' | 'continue' | 'slower' | 'repeat' | 'simpler' | 'example' | 'go_back' | 'test_me',
  ) {
    if (!activeSession) return;
    setVoiceCommandBusy(true);
    try {
      const resp = await api.sendTutorVoiceCommand(activeSession.session.id, cmd);
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-vc`, role: 'assistant', content: resp.responseText, timestamp: new Date() },
      ]);
      const contentCommands = new Set(['repeat', 'simpler', 'example', 'go_back', 'test_me']);
      if (contentCommands.has(cmd)) {
        const nextState = await api.getSessionState(activeSession.session.id);
        setActiveSession(nextState);
        await triggerTutorTurn(activeSession.session.id, nextState);
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Voice command failed.');
    } finally {
      setVoiceCommandBusy(false);
    }
  }

  function handleAudioError() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setPageError('Audio playback failed. Try again.');
  }

  if (initializing) return <SessionPageLoading />;

  if (!activeSession) {
    return (
      <SessionLauncher
        documents={readyDocuments}
        selectedDocumentId={selectedDocumentId}
        launching={launching}
        error={pageError}
        onSelectDocument={setSelectedDocumentId}
        onStart={() => void startSession()}
        onUpload={() => router.push('/upload')}
      />
    );
  }

  return (
    <ActiveSession
      sessionState={activeSession}
      messages={messages}
      input={input}
      asking={asking}
      submittingAnswer={submittingAnswer}
      requestingTurn={requestingTurn}
      voiceCommandBusy={voiceCommandBusy}
      audioUrl={audioUrl}
      error={pageError}
      onInputChange={setInput}
      onSubmitAnswer={(v) => void submitAnswer(v)}
      onAskQuestion={(v) => void askQuestion(v)}
      onNextTurn={() => activeSession && void triggerTutorTurn(activeSession.session.id)}
      onSendCommand={(cmd) => void sendVoiceCommand(cmd)}
      onAudioError={handleAudioError}
      onBack={() => router.replace('/session')}
      messagesEndRef={messagesEndRef}
    />
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<SessionPageLoading />}>
      <SessionPageContent />
    </Suspense>
  );
}
