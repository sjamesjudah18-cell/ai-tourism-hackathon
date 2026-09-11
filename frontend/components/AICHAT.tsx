"use client";

import { useState } from "react";
import { askAssistant } from "../lib/api";

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  suggestions?: string[];
};

type AIChatProps = {
  tripContext?: {
    destination: string;
    days: number;
    budget: number;
    interests?: string[];
  };
};

export default function AIChat({ tripContext }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const dest = tripContext?.destination || "Hyderabad";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: `Hello! I'm your AI Travel Concierge for ${dest}. I can help you find authentic local food, optimize your day schedule, or adjust activities to fit your budget. How can I help today?`,
      suggestions: [
        "What are the best street food spots?",
        "How can I save ₹2,000 on this trip?",
        "What should I pack for the weather?",
      ],
    },
  ]);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const res = await askAssistant(textToSend, tripContext);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: res.reply,
        suggestions: res.suggested_actions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      // Local fallback
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: `Based on your ${dest} trip, I recommend starting with the historic heritage quarter in the morning and saving lakeside and cafe spots for the evening golden hour. Local autos and metro are the best way to save on transit!`,
        suggestions: [
          "Suggest vegetarian food",
          "What are the fort visiting hours?",
          "Plan a sunset view",
        ],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 rounded-full bg-[#171717] px-5 py-3.5 text-sm font-semibold text-white shadow-2xl transition duration-300 hover:scale-105 hover:bg-black focus:outline-none focus:ring-4 focus:ring-black/20"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>✨ AI Assistant</span>
        </button>
      </div>

      {/* Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[580px] w-[92vw] max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-2xl transition-all duration-300 sm:bottom-24 sm:right-6">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/5 bg-[#171717] px-5 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d97745] text-sm font-bold">
                AI
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#dca17e]">
                  Concierge
                </p>
                <h4 className="text-sm font-semibold text-white">
                  {dest} Travel Assistant
                </h4>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#fbfbfa]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#171717] text-white rounded-br-none"
                      : "bg-white text-[#222] border border-black/5 shadow-sm rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>

                {/* Suggestions */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                    {msg.suggestions.map((sug) => (
                      <button
                        key={sug}
                        onClick={() => handleSend(sug)}
                        className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-medium text-[#555] hover:border-[#d97745] hover:text-[#d97745] transition shadow-xs"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-1.5 rounded-2xl bg-white border border-black/5 px-4 py-2.5 w-24 text-xs text-gray-500 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-black/5 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your trip..."
                className="flex-1 rounded-full border border-black/10 bg-[#fbfbfa] px-4 py-2.5 text-xs outline-none focus:border-black focus:ring-1 focus:ring-black"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="rounded-full bg-[#171717] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-black disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>

        </div>
      )}
    </>
  );
}
