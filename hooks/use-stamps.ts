"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@clerk/nextjs";

const DAILY_STAMP_LIMIT_BYTES = 10 * 1024;
// How long a cached month is considered fresh (30 minutes)
const CACHE_TTL_MS = 30 * 60 * 1000;

export type ViewMode = "month" | "week";

export interface UseStampsOptions {
  initialYear: number;
  initialMonth: number;
  initialUserId: string | null;
  initialStamps: Array<{ dateStr: string; url: string }>;
}

export interface UseStampsReturn {
  year: number;
  month: number; // 1-12
  viewMode: ViewMode;
  stamps: Map<string, string>; // dateStr -> url
  userId: string | null;
  authLoading: boolean;
  loading: boolean;
  setViewMode: (mode: ViewMode) => void;
  addStamp: (dateStr: string, blobUrl: string, blob: Blob) => Promise<void>;
  removeStamp: (dateStr: string) => Promise<void>;
  evictBrokenStamp: (dateStr: string) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  dailyLimitBytes: number;
}

// ─── Module-level cache ───────────────────────────────────────────────────────
// Keyed by `${userId}/${year}-${mm}`, stores the resolved stamp map and the
// timestamp at which it was fetched. Lives for the whole browser session.

interface CacheEntry {
  stamps: Map<string, string>;
  fetchedAt: number;
}

const stampCache = new Map<string, CacheEntry>();

function cacheKey(userId: string, year: number, month: number): string {
  return `${userId}/${year}-${String(month).padStart(2, "0")}`;
}

function getCached(
  userId: string,
  year: number,
  month: number,
): Map<string, string> | null {
  const entry = stampCache.get(cacheKey(userId, year, month));
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    stampCache.delete(cacheKey(userId, year, month));
    return null;
  }
  return entry.stamps;
}

function setCached(
  userId: string,
  year: number,
  month: number,
  stamps: Map<string, string>,
): void {
  stampCache.set(cacheKey(userId, year, month), {
    stamps,
    fetchedAt: Date.now(),
  });
}

function invalidateCache(userId: string, year: number, month: number): void {
  stampCache.delete(cacheKey(userId, year, month));
}

// ─── Fetch helper (shared between main load and prefetch) ─────────────────────

async function fetchMonthStamps(
  year: number,
  month: number,
): Promise<Map<string, string>> {
  const response = await fetch(`/api/stamps?year=${year}&month=${month}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to load stamps.");
  }

  const data = (await response.json()) as {
    stamps: Array<{ dateStr: string; url: string }>;
  };

  return new Map<string, string>(
    (data.stamps ?? []).map((item) => [item.dateStr, item.url]),
  );
}

// ─── Background prefetch (fire-and-forget) ───────────────────────────────────

function prefetchMonth(userId: string, year: number, month: number): void {
  // Skip if already cached and fresh
  if (getCached(userId, year, month)) return;

  fetchMonthStamps(year, month)
    .then((stamps) => {
      // Only write to cache if nothing has been stored in the meantime
      if (!getCached(userId, year, month)) {
        setCached(userId, year, month, stamps);
      }
    })
    .catch(() => {
      // Prefetch failures are silent — the main load will handle it
    });
}

function adjacentMonths(
  year: number,
  month: number,
): [{ year: number; month: number }, { year: number; month: number }] {
  const prev =
    month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next =
    month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return [prev, next];
}

// ─── Seed helper ──────────────────────────────────────────────────────────────
// Called once on module init with the server-prefetched data so the very first
// render can skip loading entirely.

function seedCacheFromServer(
  userId: string | null,
  year: number,
  month: number,
  serverStamps: Array<{ dateStr: string; url: string }>,
): Map<string, string> {
  if (!userId || serverStamps.length === 0) return new Map();
  // Don't overwrite a cache entry that may have been written by a previous
  // render in the same session (e.g. HMR / StrictMode double-invoke).
  const existing = getCached(userId, year, month);
  if (existing) return existing;
  const map = new Map<string, string>(
    serverStamps.map((s) => [s.dateStr, s.url]),
  );
  setCached(userId, year, month, map);
  return map;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStamps({
  initialYear,
  initialMonth,
  initialUserId,
  initialStamps,
}: UseStampsOptions): UseStampsReturn {
  const { userId, isLoaded } = useAuth();
  const resolvedUserId = userId ?? null;

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // Seed the module-level cache synchronously during the first render so that
  // the effect below immediately finds a cache hit and never shows a spinner.
  const [stamps, setStamps] = useState<Map<string, string>>(() =>
    seedCacheFromServer(
      initialUserId,
      initialYear,
      initialMonth,
      initialStamps,
    ),
  );

  // Always start loading — we don't know yet whether the user is signed in or
  // not until Clerk initialises client-side. The main load effect will set this
  // to false once auth resolves (either no user, or stamps fetched/cached).
  const [loading, setLoading] = useState(true);

  const stampsRef = useRef<Map<string, string>>(new Map());
  // Tracks the previous resolved userId so we can distinguish "Clerk initialising
  // (null → real userId)" from "user actually signed out or switched accounts".
  // Initialised to `undefined` (sentinel) so the first effect run is always a no-op.
  const prevResolvedUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    stampsRef.current = stamps;
  }, [stamps]);

  // Keep object URLs clean on unmount
  useEffect(() => {
    return () => {
      for (const url of stampsRef.current.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  // Clear stamps whenever the authenticated user genuinely changes — i.e. a
  // sign-out (userId → null), an account switch (userIdA → userIdB), or a
  // fresh sign-in after a sign-out (null → userIdB).
  //
  // The only case we skip is the very first effect run (sentinel undefined),
  // because on the client Clerk always starts with userId = undefined/null
  // while it initialises, even when the server already knew the real userId
  // and pre-rendered stamps. Clearing here would cause a hydration mismatch.
  useEffect(() => {
    const prevId = prevResolvedUserIdRef.current;
    prevResolvedUserIdRef.current = resolvedUserId;

    // First render (sentinel undefined) — Clerk hasn't reported anything yet.
    if (prevId === undefined) return;

    // The user changed (sign-out, account switch, or sign-in after sign-out)
    // — clear the entire cache and wipe stamps from state immediately so the
    // previous user's images are never visible while the new fetch is in flight.
    if (resolvedUserId !== prevId) {
      stampCache.clear();
      setStamps((prev) => {
        for (const url of prev.values()) URL.revokeObjectURL(url);
        return new Map();
      });
    }
  }, [resolvedUserId]);

  // Load stamps for the current month
  useEffect(() => {
    if (!isLoaded) return;

    if (!resolvedUserId) {
      setStamps((prev) => {
        for (const url of prev.values()) URL.revokeObjectURL(url);
        return new Map();
      });
      setLoading(false);
      return;
    }

    // ── Serve from cache immediately if available ──────────────────────
    const cached = getCached(resolvedUserId, year, month);
    if (cached) {
      setStamps(cached);
      setLoading(false);
      // Kick off adjacent prefetches and exit — no spinner, no wait
      const [prev, next] = adjacentMonths(year, month);
      prefetchMonth(resolvedUserId, prev.year, prev.month);
      prefetchMonth(resolvedUserId, next.year, next.month);
      return;
    }

    // ── Nothing cached — fetch and show loading ────────────────────────
    // Clear any stale stamps from a previous user immediately so they are
    // never visible while the new fetch is in flight.
    setStamps((prev) => {
      for (const url of prev.values()) {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      }
      return new Map();
    });
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const loaded = await fetchMonthStamps(year, month);

        if (!cancelled) {
          setCached(resolvedUserId, year, month, loaded);
          setStamps(loaded);

          // Prefetch neighbours after the main fetch completes
          const [prev, next] = adjacentMonths(year, month);
          prefetchMonth(resolvedUserId, prev.year, prev.month);
          prefetchMonth(resolvedUserId, next.year, next.month);
        }
      } catch {
        if (!cancelled) {
          setStamps(new Map());
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [year, month, resolvedUserId, isLoaded]);

  const addStamp = useCallback(
    async (dateStr: string, blobUrl: string, blob: Blob) => {
      if (!resolvedUserId) {
        throw new Error("Please sign in first.");
      }

      if (blob.size > DAILY_STAMP_LIMIT_BYTES) {
        URL.revokeObjectURL(blobUrl);
        throw new Error("This stamp is larger than 10KB. Try a simpler crop.");
      }

      const formData = new FormData();
      formData.append("dateStr", dateStr);
      formData.append("file", blob, `${dateStr}.webp`);

      const response = await fetch("/api/stamps", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to save stamp.");
      }

      const responseData = (await response.json().catch(() => null)) as {
        ok: boolean;
        url?: string;
      } | null;

      // Use the signed URL returned by the server so that the in-memory state
      // and the module-level cache always hold a real, storage-backed URL.
      // Falling back to the local blobUrl would cause cache hits in the same
      // session to serve a stale blob that may point to a completely different
      // image in memory.
      const stampUrl = responseData?.url ?? blobUrl;

      const monthNum = Number(dateStr.slice(5, 7));
      const yearNum = Number(dateStr.slice(0, 4));

      // Update the cache in-place with the new stamp URL so that subsequent
      // cache hits within the TTL window serve the correct image without a
      // round-trip to the server.
      const cached = getCached(resolvedUserId, yearNum, monthNum);
      if (cached) {
        const updatedCache = new Map(cached);
        updatedCache.set(dateStr, stampUrl);
        setCached(resolvedUserId, yearNum, monthNum, updatedCache);
      } else {
        // No live cache entry — just invalidate so the next load re-fetches.
        invalidateCache(resolvedUserId, yearNum, monthNum);
      }

      // Revoke the local blob URL now that we have the signed URL; if we fell
      // back to blobUrl itself don't double-revoke it below.
      if (stampUrl !== blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }

      setStamps((prev) => {
        const next = new Map(prev);
        const previousUrl = next.get(dateStr);
        if (previousUrl && previousUrl !== stampUrl) {
          if (previousUrl.startsWith("blob:")) URL.revokeObjectURL(previousUrl);
        }
        next.set(dateStr, stampUrl);
        return next;
      });
    },
    [resolvedUserId],
  );

  const removeStamp = useCallback(
    async (dateStr: string) => {
      if (!resolvedUserId) {
        throw new Error("Please sign in first.");
      }

      const response = await fetch(
        `/api/stamps?dateStr=${encodeURIComponent(dateStr)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Failed to remove stamp.");
      }

      // Invalidate the cache for this month
      const monthNum = Number(dateStr.slice(5, 7));
      const yearNum = Number(dateStr.slice(0, 4));
      invalidateCache(resolvedUserId, yearNum, monthNum);

      setStamps((prev) => {
        const next = new Map(prev);
        const url = next.get(dateStr);
        if (url) URL.revokeObjectURL(url);
        next.delete(dateStr);
        return next;
      });
    },
    [resolvedUserId],
  );

  const goToPrevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  // Called by StampCell's onError when a signed URL returns 404/403 — the file
  // was deleted directly in the bucket. Removes it from state and cache
  // immediately without any network request so the broken image disappears.
  const evictBrokenStamp = useCallback(
    (dateStr: string) => {
      const monthNum = Number(dateStr.slice(5, 7));
      const yearNum = Number(dateStr.slice(0, 4));
      if (resolvedUserId) {
        invalidateCache(resolvedUserId, yearNum, monthNum);
      }
      setStamps((prev) => {
        if (!prev.has(dateStr)) return prev;
        const next = new Map(prev);
        const url = next.get(dateStr);
        // Only revoke blob URLs — signed URLs are managed by Supabase CDN
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
        next.delete(dateStr);
        return next;
      });
    },
    [resolvedUserId],
  );

  return {
    year,
    month,
    viewMode,
    stamps,
    userId: resolvedUserId,
    authLoading: !isLoaded,
    loading,
    setViewMode,
    addStamp,
    removeStamp,
    evictBrokenStamp,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    dailyLimitBytes: DAILY_STAMP_LIMIT_BYTES,
  };
}
