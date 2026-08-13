"use client";

import { Link as LinkIcon } from "lucide-react";

export default function JoinLinkButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200"
    >
      <LinkIcon size={12} />
      <span className="underline underline-offset-2">Join Link</span>
    </a>
  );
}
