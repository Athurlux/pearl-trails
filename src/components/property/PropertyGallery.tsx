"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface GalleryImage {
  url: string;
  alt: string;
}

/**
 * Editorial gallery: a snap rail on mobile, a hero plus a two-by-two block on
 * desktop, and a lightbox behind both.
 *
 * One DOM node per image, reshaped with CSS. Rendering a mobile rail and a
 * desktop grid separately looked identical but made the browser download every
 * photograph twice — `lg:hidden` hides an image, it does not stop the fetch.
 *
 * The lightbox is about sixty lines rather than a dependency: arrow keys,
 * Escape, focus handling and a live region are all it actually needs.
 */
export function PropertyGallery({
  images,
  name,
}: {
  images: GalleryImage[];
  name: string;
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const open = (index: number) => {
    returnFocusRef.current = document.activeElement as HTMLElement;
    setOpenAt(index);
  };

  const close = useCallback(() => {
    setOpenAt(null);
    returnFocusRef.current?.focus();
  }, []);

  const step = useCallback(
    (delta: number) =>
      setOpenAt((current) =>
        current === null ? null : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (openAt === null) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [openAt, close, step]);

  if (images.length === 0) return null;

  return (
    <div className="relative">
      <ul className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-5 px-5 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:grid-rows-2 lg:gap-2 lg:overflow-visible lg:px-0 lg:pb-0">
        {images.map((image, i) => (
          <li
            key={image.url + i}
            className={[
              "w-[86vw] shrink-0 snap-start sm:w-[60vw]",
              "lg:w-auto lg:shrink",
              i === 0 ? "lg:col-span-2 lg:row-span-2" : "",
              // Beyond the fifth frame the desktop composition is full; those
              // images stay reachable through the rail and the lightbox.
              i > 4 ? "lg:hidden" : "",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => open(i)}
              aria-label={`Open photo ${i + 1} of ${images.length} for ${name}`}
              className={[
                "group relative block aspect-[4/3] w-full overflow-hidden bg-ivory-warm",
                "rounded-sm lg:rounded-none",
                i === 0 ? "lg:h-full lg:rounded-l-sm" : "",
                i === 2 ? "lg:rounded-tr-sm" : "",
                i === 4 ? "lg:rounded-br-sm" : "",
              ].join(" ")}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                sizes="(max-width: 1024px) 86vw, (max-width: 1400px) 50vw, 700px"
                className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[0.8rem] text-muted lg:hidden">
        {images.length} photos · tap to enlarge
      </p>

      <button
        type="button"
        onClick={() => open(0)}
        className="absolute bottom-4 right-4 hidden rounded-sm bg-ivory/95 px-4 py-2.5 text-[0.85rem] font-medium text-forest shadow-[0_6px_20px_-8px_rgba(10,44,36,0.5)] backdrop-blur-sm transition-colors hover:bg-white lg:block"
      >
        View all {images.length} photos
      </button>

      {openAt !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photos`}
          className="fixed inset-0 z-[80] flex flex-col bg-forest-deep/97"
        >
          <div className="flex items-center justify-between px-5 py-4 sm:px-8">
            <p aria-live="polite" className="text-[0.85rem] tabular-nums text-ivory/80">
              {openAt + 1} / {images.length}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close photos"
              className="flex h-11 w-11 items-center justify-center rounded-full text-ivory transition-colors hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" strokeWidth="1.6" className="h-5 w-5 stroke-current">
                <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="relative flex-1">
            <Image
              key={images[openAt].url}
              src={images[openAt].url}
              alt={images[openAt].alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ivory/30 text-ivory transition-colors hover:border-ivory"
            >
              <span aria-hidden="true">&larr;</span>
            </button>
            <p className="flex-1 text-center text-[0.85rem] text-ivory/70">
              {images[openAt].alt}
            </p>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-ivory/30 text-ivory transition-colors hover:border-ivory"
            >
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
