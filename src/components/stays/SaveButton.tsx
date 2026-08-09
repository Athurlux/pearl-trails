"use client";

import { toggleSavedStay, useSavedStays } from "@/lib/savedStays";

export function SaveButton({ slug, name }: { slug: string; name: string }) {
  const saved = useSavedStays();
  const isSaved = saved.has(slug);

  return (
    <button
      type="button"
      onClick={() => toggleSavedStay(slug)}
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${name} from saved` : `Save ${name}`}
      className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/90 backdrop-blur-sm transition-all duration-300 hover:bg-ivory"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        strokeWidth="1.6"
        className={[
          "h-[18px] w-[18px] transition-all duration-300",
          isSaved ? "scale-110 fill-forest stroke-forest" : "fill-none stroke-forest/70",
        ].join(" ")}
      >
        <path d="M12 20.5S3.8 15.1 3.8 9.6A4.6 4.6 0 0 1 12 6.9a4.6 4.6 0 0 1 8.2 2.7c0 5.5-8.2 10.9-8.2 10.9Z" />
      </svg>
    </button>
  );
}
