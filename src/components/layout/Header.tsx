"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const navLinks = [
  { label: "Stays", href: "#stays" },
  { label: "Destinations", href: "#destinations" },
  { label: "Experiences", href: "#experiences" },
  { label: "About", href: "#about" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        solid
          ? "bg-ivory/95 backdrop-blur-md border-b border-line shadow-[0_1px_20px_rgba(15,61,50,0.06)]"
          : "bg-gradient-to-b from-black/45 to-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-12">
        <Link href="/" aria-label="Pearl Trails home" className="shrink-0">
          <Image
            src={solid ? "/brand/logo-primary.png" : "/brand/logo-reversed.png"}
            alt="Pearl Trails"
            width={190}
            height={54}
            priority
            className="h-8 w-auto sm:h-9"
          />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className={[
                    "text-[0.9rem] tracking-wide transition-colors",
                    solid ? "text-ink/80 hover:text-forest" : "text-ivory/90 hover:text-white",
                  ].join(" ")}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          <a
            href="#stays"
            className={[
              "text-[0.9rem] transition-colors",
              solid ? "text-ink/70 hover:text-forest" : "text-ivory/85 hover:text-white",
            ].join(" ")}
          >
            Sign in
          </a>
          <a
            href="#destinations"
            className={[
              "rounded-sm px-5 py-2.5 text-[0.85rem] font-medium tracking-wide transition-all duration-300",
              solid
                ? "bg-forest text-ivory hover:bg-forest-soft"
                : "bg-ivory/95 text-forest hover:bg-white",
            ].join(" ")}
          >
            Explore Uganda
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className={[
            "flex h-11 w-11 items-center justify-center rounded-sm transition-colors lg:hidden",
            solid ? "text-forest hover:bg-ivory-warm" : "text-ivory hover:bg-white/10",
          ].join(" ")}
        >
          <span className="relative block h-4 w-6" aria-hidden="true">
            <span
              className={[
                "absolute left-0 block h-[1.5px] w-6 bg-current transition-all duration-300",
                open ? "top-[7px] rotate-45" : "top-0",
              ].join(" ")}
            />
            <span
              className={[
                "absolute left-0 top-[7px] block h-[1.5px] w-6 bg-current transition-all duration-200",
                open ? "opacity-0" : "opacity-100",
              ].join(" ")}
            />
            <span
              className={[
                "absolute left-0 block h-[1.5px] w-6 bg-current transition-all duration-300",
                open ? "top-[7px] -rotate-45" : "top-[14px]",
              ].join(" ")}
            />
          </span>
        </button>
      </div>

      {/* Mobile sheet — a designed panel, not hidden desktop links */}
      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-line bg-ivory lg:hidden"
      >
        <nav aria-label="Mobile" className="px-5 py-6 sm:px-8">
          <ul className="space-y-1">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line/70 py-4 font-display text-2xl text-forest"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col gap-3">
            <a
              href="#destinations"
              onClick={() => setOpen(false)}
              className="rounded-sm bg-forest px-5 py-3.5 text-center text-sm font-medium tracking-wide text-ivory"
            >
              Explore Uganda
            </a>
            <a
              href="#stays"
              onClick={() => setOpen(false)}
              className="rounded-sm border border-line px-5 py-3.5 text-center text-sm text-forest"
            >
              Sign in
            </a>
          </div>
          <p className="eyebrow mt-8 text-muted">Stays that stay with you</p>
        </nav>
      </div>
    </header>
  );
}
