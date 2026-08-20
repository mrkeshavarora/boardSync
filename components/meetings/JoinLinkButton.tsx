"use client";

import { Video } from "lucide-react";

export default function JoinLinkButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-600 btn-gradient keep-white shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
    >
      <Video size={13} />
      <span>Join</span>
    </a>
  );
}
