"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Smile, ThumbsUp, Heart, Briefcase, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👏", "🚀", "✨", "💯", "🙏"];

const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "Smileys",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇",
      "🥰", "😍", "🤩", "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗",
      "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥",
      "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶",
      "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐"
    ],
  },
  {
    id: "gestures",
    name: "Gestures",
    icon: ThumbsUp,
    emojis: [
      "👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️",
      "👋", "🤚", "🖐", "✋", "🖖", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️",
      "✌️", "🤞", "🤏", "👌", "🤌", "💪", "🦾", "🤳"
    ],
  },
  {
    id: "symbols",
    name: "Symbols",
    icon: Heart,
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞",
      "💓", "💗", "💖", "💘", "💝", "💟", "⭐", "🌟", "✨", "💥", "🔥", "⚡", "🌈",
      "☀️", "🎉", "🎊", "🏆", "🥇", "🎯", "💯", "✅", "❌", "⚠️", "🔔", "💡", "📌", "📍"
    ],
  },
  {
    id: "work",
    name: "Office & Objects",
    icon: Briefcase,
    emojis: [
      "💼", "📁", "📂", "📄", "📃", "📊", "📈", "📉", "📜", "📋", "📎", "📏", "📑",
      "📒", "📓", "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🔗", "✉️", "📧", "📨",
      "📩", "📦", "🏷️", "💻", "🖥️", "🖨️", "📱", "📞", "🔑", "🔒", "🔓", "⚙️", "🧰",
      "🚀", "☕", "🍕", "🍔"
    ],
  },
];

export default function EmojiPicker({ onSelect, onClose, className }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    return Array.from(new Set(all));
  }, [search]);

  return (
    <div
      ref={pickerRef}
      className={cn(
        "w-80 sm:w-96 rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden animate-fade-in flex flex-col z-50",
        className
      )}
      style={{
        background: "rgba(11, 16, 33, 0.96)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header with Quick Reactions */}
      <div className="p-3 border-b border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-600 text-indigo-400">
            <Sparkles size={13} />
            <span>Quick Reactions</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Quick Reaction Buttons */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 rounded-lg hover:bg-white/[0.08] active:scale-95 flex items-center justify-center text-lg transition-transform hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search emojis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] text-white/90 placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
      </div>

      {/* Category Tabs */}
      {!search && (
        <div className="flex items-center gap-1 px-3 py-1 border-b border-white/[0.06]">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-xs font-500 flex items-center justify-center gap-1.5 transition-all",
                  isActive
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    : "text-white/40 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <Icon size={13} />
                <span className="hidden sm:inline text-[11px]">{cat.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="p-3 max-h-52 overflow-y-auto grid grid-cols-7 sm:grid-cols-8 gap-1.5">
        {filteredEmojis ? (
          filteredEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className="w-9 h-9 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))
        ) : (
          EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className="w-9 h-9 rounded-lg hover:bg-white/[0.08] flex items-center justify-center text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
