"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Rest timer driven by a target end timestamp (not by counting interval
 * ticks), so a throttled/backgrounded tab never drifts: remaining time is
 * always `endAt - Date.now()`. State is mirrored to localStorage so it also
 * survives remounts and reloads.
 */

export type RestTimerState = {
  endAt: number;
  totalSeconds: number;
  label?: string;
};

const STORAGE_KEY = "gymforge:rest-timer";
const MIN_SECONDS = 5;
const MAX_SECONDS = 60 * 30;

function readStored(): RestTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RestTimerState;
    if (typeof parsed?.endAt !== "number" || parsed.endAt <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(state: RestTimerState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode etc.) — timer still works in memory
  }
}

// --- alerts -----------------------------------------------------------------

let audioCtx: AudioContext | null = null;

/** Create/resume the AudioContext. Call from a user gesture (iOS unlock). */
export function primeAudio() {
  if (typeof window === "undefined") return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    audioCtx = null;
  }
}

function beep() {
  if (!audioCtx) primeAudio();
  const ctx = audioCtx;
  if (!ctx) return;
  const start = ctx.currentTime + 0.01;
  // Three short pulses, the last one higher
  [0, 0.25, 0.5].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = i === 2 ? 1320 : 880;
    const t = start + offset;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
}

function vibrate() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // unsupported
  }
}

// --- hook -------------------------------------------------------------------

export function useRestTimer(options: { sound: boolean; vibrate: boolean }) {
  // Restored from storage so a running timer survives remounts/reloads.
  // (Only rendered after Convex data has loaded, so no hydration mismatch.)
  const [timer, setTimerState] = useState<RestTimerState | null>(readStored);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const setTimer = useCallback((next: RestTimerState | null) => {
    setTimerState(next);
    writeStored(next);
  }, []);

  // Completion: one timeout aimed at endAt (re-armed whenever endAt changes)
  useEffect(() => {
    if (!timer) return;
    const fire = () => {
      // Skip stale alerts (e.g. tab was frozen long past the end)
      if (Date.now() - timer.endAt < 5000) {
        if (optionsRef.current.sound) beep();
        if (optionsRef.current.vibrate) vibrate();
      }
      setTimer(null);
    };
    const delay = timer.endAt - Date.now();
    if (delay <= 0) {
      fire();
      return;
    }
    const id = window.setTimeout(fire, delay);
    return () => window.clearTimeout(id);
  }, [timer, setTimer]);

  const start = useCallback(
    (seconds: number, label?: string) => {
      primeAudio();
      const total = Math.min(Math.max(Math.round(seconds), MIN_SECONDS), MAX_SECONDS);
      setTimer({ endAt: Date.now() + total * 1000, totalSeconds: total, label });
    },
    [setTimer]
  );

  const adjust = useCallback(
    (deltaSeconds: number) => {
      setTimerState((prev) => {
        if (!prev) return prev;
        const endAt = prev.endAt + deltaSeconds * 1000;
        const next =
          endAt - Date.now() <= 0
            ? null
            : {
                ...prev,
                endAt,
                totalSeconds: Math.max(prev.totalSeconds + deltaSeconds, 1),
              };
        writeStored(next);
        return next;
      });
    },
    []
  );

  const skip = useCallback(() => setTimer(null), [setTimer]);

  // Display ticking lives in <RestTimerBar>, so the whole logger doesn't
  // re-render several times a second.
  return { timer, start, adjust, skip };
}
