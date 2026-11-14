import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AssessmentState,
  DEFAULT_QUICK_ASK_PROMPT,
  LearnerProfile,
  LessonItem,
  MENTOR_PROMPTS,
  MentorMessage,
} from '../data/portalData';
import { askGeminiMentor, CareerMatchAnalysis } from '../services/learningEngine';

interface LearningPathChatbotProps {
  profile: LearnerProfile;
  careerMatch: CareerMatchAnalysis;
  recommendedNext: LessonItem | null;
  assessment: AssessmentState;
  completedCount: number;
  inProgressCount: number;
  totalModules: number;
}

export function LearningPathChatbot({
  profile,
  careerMatch,
  recommendedNext,
  assessment,
  completedCount,
  inProgressCount,
  totalModules,
}: LearningPathChatbotProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<MentorMessage[]>([
    {
      id: 'lp-mentor-welcome',
      role: 'mentor',
      text: `Hi ${profile.name || 'there'}! I’m your Gemini AI Study Mentor. Click “${DEFAULT_QUICK_ASK_PROMPT}” or ask any question about your ${profile.careerGoal} roadmap.`,
    },
  ]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isSending) return;

    if (!isOpen) {
      setIsOpen(true);
    }

    const userMsg: MentorMessage = {
      id: `lp-learner-${Date.now()}`,
      role: 'learner',
      text: trimmed,
    };

    const historySnapshot = messages
      .filter((m) => !m.isError)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsSending(true);

    try {
      const reply = await askGeminiMentor(trimmed, historySnapshot, {
        profile,
        match: careerMatch,
        recommendedNext,
        assessment,
        completedCount,
        inProgressCount,
        totalModules,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `lp-mentor-${Date.now()}`,
          role: 'mentor',
          text: reply,
        },
      ]);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error && err.message
          ? err.message
          : 'Unable to reach Gemini AI right now. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: `lp-err-${Date.now()}`,
          role: 'mentor',
          text: errMsg,
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(inputValue);
  };

  const handleToggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => {
          inputRef.current?.focus({ preventScroll: true });
        }, 120);
      }
      return next;
    });
  };

  return (
    <section
      aria-label="Gemini AI Study Chatbot"
      className="rounded-[22px] border border-[#E6D7B3] bg-[#FCFBF8]/92 backdrop-blur-md shadow-[0_18px_46px_-20px_rgba(40,28,8,0.28)] overflow-hidden"
    >
      {/* Compact Collapsible Top Header Row */}
      <div className="px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-[#E6D4AA] bg-gradient-to-b from-[#FAF3DE] to-[#F3E6C3] flex items-center justify-center shrink-0 text-[#9E7016]">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm sm:text-[15px] font-bold text-[#1B1710]">
                AI Study Chatbot
              </span>
              <span className="text-[11px] font-semibold text-[#9E7016]">
                · Gemini AI
              </span>
            </div>
            <p className="text-xs text-[#5A5140] truncate">
              {profile.careerGoal} ({careerMatch.matchPercent}% match)
              {recommendedNext ? ` · Next: ${recommendedNext.skill}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isSending}
            onClick={() => void sendMessage(DEFAULT_QUICK_ASK_PROMPT)}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] disabled:opacity-60 text-[#1A150B] text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{DEFAULT_QUICK_ASK_PROMPT}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleOpen}
            aria-expanded={isOpen}
            aria-controls="learning-path-chatbot-body"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border border-[#DEC99A] bg-white/95 hover:bg-[#FAF5E8] text-xs font-semibold text-[#1B1710] shadow-xs transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
          >
            <span>{isOpen ? 'Hide chat' : 'Open AI chat'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#9E7016] transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Expandable Chat Thread & Input */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="learning-path-chatbot-body"
            initial={prefersReducedMotion ? { opacity: 1 } : { height: 0, opacity: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-[#EFE4CA] bg-[#FAF6EC]/90"
          >
            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Message Feed */}
              <div
                aria-live="polite"
                className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1"
              >
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line ${
                      msg.isError
                        ? 'bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2'
                        : msg.role === 'mentor'
                        ? 'bg-white border border-[#E6D7B3] text-[#1B1710] mr-4 sm:mr-10 shadow-xs'
                        : 'bg-gradient-to-b from-[#ECD082] to-[#C89B3C] text-[#1A150B] font-medium ml-6 sm:ml-14'
                    }`}
                  >
                    {msg.isError && (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span>{msg.text}</span>
                  </div>
                ))}

                {isSending && (
                  <div className="rounded-2xl px-4 py-2.5 bg-white border border-[#E6D7B3] text-xs text-[#6A5F4B] inline-flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9E7016]" aria-hidden="true" />
                    <span>Thinking with Gemini...</span>
                  </div>
                )}
              </div>

              {/* Default & Contextual Quick-Ask Question Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {MENTOR_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isSending}
                    onClick={() => void sendMessage(prompt)}
                    className={`min-h-[40px] text-left text-xs px-3.5 py-1.5 rounded-[14px] border transition-colors cursor-pointer disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623] ${
                      prompt === DEFAULT_QUICK_ASK_PROMPT
                        ? 'border-[#C89B3C] bg-[#FAF3DE] font-semibold text-[#1B1710] hover:bg-[#F3E7C5]'
                        : 'border-[#DEC99A] bg-white hover:bg-[#F7F1E2] text-[#3C3426]'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Composer */}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  disabled={isSending}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Gemini about your roadmap, skill gaps, or current step..."
                  aria-label="Ask AI Study Chatbot"
                  className="flex-1 min-h-[44px] rounded-[14px] border border-[#E2CFA3] bg-white px-3.5 py-2 text-sm text-[#1B1710] placeholder:text-[#9A8E78] focus:outline-none focus:border-[#C89B3C] focus:ring-2 focus:ring-[#C89B3C]/40 disabled:opacity-65"
                />
                <button
                  type="submit"
                  disabled={isSending || !inputValue.trim()}
                  aria-label="Send question"
                  className="min-h-[44px] min-w-[44px] px-4 rounded-[14px] border border-[#F5DE9B]/80 bg-gradient-to-b from-[#ECD082] to-[#C89B3C] hover:from-[#F3DA94] hover:to-[#BA8D2F] disabled:opacity-55 text-[#1A150B] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] inline-flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B68623]"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
