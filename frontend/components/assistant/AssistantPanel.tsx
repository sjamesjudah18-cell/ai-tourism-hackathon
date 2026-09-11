"use client";

/**
 * The Travel Reality Concierge, as a dockable panel.
 *
 * Replaces the floating chat-bubble launcher. The distinction that matters:
 * this panel can drive the shared map store - filtering markers, flying to a
 * destination, selecting a stop - so it reads as operating the same canvas the
 * user operates manually, rather than a separate chat app bolted on top.
 *
 * On desktop it docks to the right edge and pushes nothing; on mobile it
 * becomes a bottom sheet.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { askAssistant } from "../../lib/api";
import type { ItineraryDay } from "../../lib/api";
import {
  toMarkerCategory,
  useMapState,
  type MarkerCategory,
} from "../../lib/mapStore";
import type { TravelReality } from "../../types/reality";
import { Button, Meta } from "../ui/Primitives";

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  suggestions?: string[];
  labels?: string[];
};

type AssistantPanelProps = {
  tripContext?: {
    destination: string;
    days: number;
    budget: number;
    interests?: string[];
  };
  itinerary?: ItineraryDay[];
  reality?: TravelReality | null;
};

/** Provenance tags the concierge emits inline. */
const LABEL_TONE: Record<string, string> = {
  VERIFIED: "text-emerald-700",
  ESTIMATED: "text-amber-700",
  "GENERAL KNOWLEDGE": "text-sky-700",
  UNAVAILABLE: "text-[#8f8f88]",
};

const LABEL_PATTERN = /\[(VERIFIED|ESTIMATED|GENERAL KNOWLEDGE|UNAVAILABLE)\]/g;

function renderWithLabels(text: string) {
  return text.split(LABEL_PATTERN).map((part, index) => {
    const tone = LABEL_TONE[part];
    if (tone) {
      return (
        <span
          key={index}
          className={`mx-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}
        >
          {part === "GENERAL KNOWLEDGE" ? "general" : part.toLowerCase()}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

/**
 * Maps intent in a question onto map actions, so asking about hotels actually
 * filters the canvas. Deliberately keyword-based rather than asking the model
 * to emit commands - deterministic behaviour belongs in code.
 */
const MAP_INTENTS: { keywords: string[]; categories: MarkerCategory[] }[] = [
  { keywords: ["hotel", "stay", "accommodation"], categories: ["hotel"] },
  { keywords: ["eat", "food", "restaurant", "dish", "biryani"], categories: ["food"] },
  { keywords: ["beach", "sea", "coast"], categories: ["beach"] },
  { keywords: ["museum", "culture", "heritage"], categories: ["culture"] },
  { keywords: ["adventure", "trek", "outdoor", "activity"], categories: ["activity"] },
];

export default function AssistantPanel({
  tripContext,
  itinerary,
  reality,
}: AssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { setCategories, setActiveDay } = useMapState();
  const destination = tripContext?.destination || "your destination";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `Ask me what to really expect in ${destination} — weather, costs, traffic, food, or why you received an alert. I'll tell you what we've verified and what's only an estimate.`,
      suggestions: [
        "Will it rain during my trip?",
        "How much should I really expect to spend?",
        "Show me hotels",
      ],
    },
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  /** Applies any map intent the question implies. */
  function applyMapIntent(question: string) {
    const lowered = question.toLowerCase();

    const dayMatch = lowered.match(/day\s*(\d+)/);
    if (dayMatch) setActiveDay(Number(dayMatch[1]));

    for (const intent of MAP_INTENTS) {
      if (intent.keywords.some((k) => lowered.includes(k))) {
        setCategories(intent.categories);
        return;
      }
    }
    if (lowered.includes("everything") || lowered.includes("all stops")) {
      setCategories([]);
    }
  }

  async function send(queryText?: string) {
    const text = (queryText || input).trim();
    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}`, sender: "user", text },
    ]);
    if (!queryText) setInput("");
    setLoading(true);

    applyMapIntent(text);

    const history = messages.slice(-6).map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));

    try {
      const res = await askAssistant(text, tripContext, history, itinerary, reality);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now() + 1}`,
          sender: "assistant",
          text: res.reply,
          suggestions: res.suggested_actions,
          labels: res.labels_used,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now() + 1}`,
          sender: "assistant",
          text: `[UNAVAILABLE] I can't reach the reality service right now, so I can't tell you anything verified about your ${destination} trip. Your itinerary is unaffected.`,
          suggestions: ["Try again"],
          labels: ["UNAVAILABLE"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const grounded = useMemo(() => Boolean(reality), [reality]);

  return (
    <>
      {/* Dock tab — a labelled edge control, not a floating chat bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="
            fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full
            border border-[rgba(0,0,0,0.1)] bg-white px-4 py-2.5 shadow-lg
            transition hover:border-[rgba(0,0,0,0.25)]
            lg:bottom-auto lg:right-0 lg:top-1/2 lg:-translate-y-1/2
            lg:rounded-r-none lg:rounded-l-xl lg:py-4
          "
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              grounded ? "bg-emerald-500" : "bg-[#b5b5ad]"
            }`}
          />
          <span className="text-[13px] font-semibold text-[#171717]">Concierge</span>
        </button>
      )}

      {open && (
        <aside
          className="
            animate-sheet-up fixed inset-x-0 bottom-0 z-50 flex h-[78vh] flex-col
            rounded-t-2xl border-t border-[rgba(0,0,0,0.12)] bg-white shadow-2xl
            lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:w-[380px]
            lg:rounded-none lg:border-l lg:border-t-0
          "
          role="complementary"
          aria-label="Travel Reality Concierge"
        >
          <header className="flex items-start justify-between gap-3 border-b border-[rgba(0,0,0,0.08)] px-5 py-4">
            <div>
              <p className="t-label">Travel Reality</p>
              <h2 className="t-title mt-0.5">Concierge</h2>
              <p className="t-caption mt-1">
                {grounded
                  ? "Grounded in live conditions for this trip"
                  : "Not grounded — no reality data loaded"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close concierge"
              className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-[#b5b5ad] transition hover:bg-[#f5f3ee] hover:text-[#171717]"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.sender === "user" ? (
                  <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#171717] px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                    {msg.text}
                  </p>
                ) : (
                  <div className="max-w-[95%]">
                    <p className="text-[13px] leading-relaxed text-[#2a2a26]">
                      {renderWithLabels(msg.text)}
                    </p>
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {msg.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => send(suggestion)}
                            className="rounded-full border border-[rgba(0,0,0,0.1)] px-2.5 py-1 text-[11px] font-medium text-[#6b6b66] transition hover:border-[#d97745] hover:text-[#8a5a3b]"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#c9c9c2]"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t border-[rgba(0,0,0,0.08)] p-3"
          >
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your trip…"
                className="flex-1 rounded-full border border-[rgba(0,0,0,0.12)] bg-[#faf9f7] px-4 py-2.5 text-[13px] outline-none transition focus:border-[#171717] focus:bg-white"
              />
              <Button type="submit" size="sm" disabled={!input.trim() || loading}>
                Send
              </Button>
            </div>
            <Meta className="mt-2 block text-center">
              The concierge can explain and suggest, but never changes your plan.
            </Meta>
          </form>
        </aside>
      )}
    </>
  );
}
