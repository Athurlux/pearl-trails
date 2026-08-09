/**
 * Minimal cross-island store.
 *
 * The search control and the stays grid are two separate client islands with
 * server-rendered content between them. Rather than wrapping the whole page in a
 * provider (which would drag every section into the client bundle), they share
 * this tiny module-level store via useSyncExternalStore.
 *
 * Release 1 has no backend: "searching" filters the local demo data. When a real
 * API arrives this becomes the place that holds query state, not a rewrite.
 */

export interface SearchQuery {
  destinationSlug: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guests: number;
  /** Bumped on every submit so the grid can react even to an identical query. */
  submittedAt: number | null;
}

const initial: SearchQuery = {
  destinationSlug: null,
  checkIn: null,
  checkOut: null,
  guests: 2,
  submittedAt: null,
};

let state: SearchQuery = initial;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): SearchQuery {
  return state;
}

export function getServerSnapshot(): SearchQuery {
  return initial;
}

export function submitSearch(query: Omit<SearchQuery, "submittedAt">) {
  state = { ...query, submittedAt: Date.now() };
  emit();
}

export function clearSearch() {
  state = initial;
  emit();
}
