"use client";

import { useSyncExternalStore } from "react";

/**
 * Saved stays — prototype convenience only.
 *
 * There are no accounts in Release 2, so this lives in localStorage and belongs
 * to the browser, not to a person. When traveller accounts arrive this becomes
 * the local half of a server-synced list; the component API should not change.
 *
 * Same module-store pattern as the landing page search: several independent
 * card islands share state without a provider wrapping the tree.
 */

const KEY = "pearl-trails:saved-stays";

let ids: ReadonlySet<string> = new Set();
let loaded = false;
const listeners = new Set<() => void>();
const empty: ReadonlySet<string> = new Set();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        ids = new Set(parsed.filter((v): v is string => typeof v === "string"));
      }
    }
  } catch {
    // Private mode, quota, or a corrupted value. Saving is a nicety — losing it
    // must never take the page down with it.
  }
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    // Same reasoning: keep the in-memory state, accept that it will not survive.
  }
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    emit();
  };
  // Keep two open tabs in agreement.
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): ReadonlySet<string> {
  load();
  return ids;
}

/** The server has no localStorage, so nothing is saved during SSR. */
function getServerSnapshot(): ReadonlySet<string> {
  return empty;
}

export function toggleSavedStay(slug: string) {
  load();
  const next = new Set(ids);
  if (!next.delete(slug)) next.add(slug);
  ids = next;
  persist();
  emit();
}

export function useSavedStays(): ReadonlySet<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
