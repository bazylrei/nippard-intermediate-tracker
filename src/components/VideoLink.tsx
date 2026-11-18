"use client";

import type { ReactNode } from "react";
import { openInYouTubeApp } from "@/lib/youtube";

interface Props {
  url: string;
  className?: string;
  children: ReactNode;
}

/** A demo-video link: opens in the YouTube app on a phone that has it, otherwise in a new browser tab. */
export default function VideoLink({ url, className, children }: Props) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => { if (openInYouTubeApp(url)) e.preventDefault(); }}
    >
      {children}
    </a>
  );
}
