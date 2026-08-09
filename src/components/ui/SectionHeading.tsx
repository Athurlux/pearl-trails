import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  intro?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  action?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  tone = "light",
  action,
}: SectionHeadingProps) {
  const isDark = tone === "dark";

  return (
    <Reveal
      className={[
        "flex flex-col gap-6",
        align === "center" ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
      ].join(" ")}
    >
      <div className={align === "center" ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow ? (
          <p className={`eyebrow ${isDark ? "text-sand" : "text-gold"}`}>{eyebrow}</p>
        ) : null}
        <h2
          className={[
            "mt-3 text-[clamp(1.9rem,3.6vw,3.1rem)] leading-[1.06]",
            isDark ? "text-ivory" : "text-forest",
          ].join(" ")}
        >
          {title}
        </h2>
        {intro ? (
          <p
            className={[
              "mt-4 max-w-xl text-[1rem] leading-relaxed",
              isDark ? "text-ivory/75" : "text-muted",
            ].join(" ")}
          >
            {intro}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </Reveal>
  );
}
