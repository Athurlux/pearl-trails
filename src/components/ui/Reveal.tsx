"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Stagger offset in ms. Keep small — this is punctuation, not choreography. */
  delay?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article";
}

/**
 * Tiny scroll-reveal primitive.
 *
 * Deliberately CSS-driven and dependency-free: no animation library ships to the
 * client for what is a fade and an 18px rise. `prefers-reduced-motion` is handled
 * in globals.css, so reduced-motion users get the final state immediately.
 */
export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If the browser cannot observe, just show it. Written straight to the DOM
    // rather than through setState: this is a one-way fallback, and a synchronous
    // setState inside an effect would only cause a cascading render.
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.shown = "true";
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as;

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      data-shown={shown}
      className={`reveal ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
