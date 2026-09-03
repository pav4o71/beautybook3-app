"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger index for grid items (0-based). */
  index?: number;
  as?: "div" | "li";
};

/**
 * Scroll-triggered fade/rise — inspired by Animata / UI Layouts micro-reveals.
 * Original implementation; prefers-reduced-motion respected.
 */
export function Reveal({
  children,
  className = "",
  index = 0,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={`bb-reveal ${visible ? "bb-reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${Math.min(index, 8) * 55}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}
