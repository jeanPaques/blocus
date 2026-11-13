import { useEffect, useRef, useState } from "react";
import { Timer, Pause, Play, RotateCcw } from "lucide-react";

const WORK = 25 * 60 * 1000;
const BREAK = 5 * 60 * 1000;

function ring() {
  try {
    const ctx = new AudioContext();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.3);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.32);
    });
  } catch { /* no audio */ }
}

export function Pomodoro() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [left, setLeft] = useState(WORK);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(0);
  const worker = useRef<Worker | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const w = new Worker(new URL("../../lib/pomodoro.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    w.onmessage = (e: MessageEvent<{ left: number }>) => {
      setLeft(e.data.left);
      if (e.data.left === 0) {
        ring(); setFlash((f) => f + 1);
        const next = phaseRef.current === "work" ? "break" : "work";
        setPhase(next);
        const ms = next === "work" ? WORK : BREAK;
        setLeft(ms);
        w.postMessage({ cmd: "start", ms });
      }
    };
    return () => w.terminate();
  }, []);

  const toggle = () => {
    if (running) worker.current?.postMessage({ cmd: "stop" });
    else worker.current?.postMessage({ cmd: "start", ms: left });
    setRunning(!running);
  };
  const reset = () => {
    worker.current?.postMessage({ cmd: "stop" });
    setRunning(false); setPhase("work"); setLeft(WORK);
  };
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <>
      {flash > 0 && <div key={flash} className="flash pointer-events-none fixed inset-0 z-50 opacity-0" />}
      <div className="no-print fixed bottom-4 right-4 z-40">
        {open ? (
          <div className="w-60 rounded-xl border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{phase === "work" ? "Travail" : "Pause"}</span>
              <button onClick={() => setOpen(false)} aria-label="Réduire le minuteur">✕</button>
            </div>
            <div className="my-2 text-center font-mono text-4xl tabular-nums">{mm}:{ss}</div>
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={toggle}>{running ? <Pause size={16} /> : <Play size={16} />}{running ? "Pause" : "Lancer"}</button>
              <button className="btn btn-ghost" onClick={reset} aria-label="Recommencer"><RotateCcw size={16} /></button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">25 min de travail, 5 min de pause, enchaînés automatiquement.</p>
          </div>
        ) : (
          <button className="btn btn-ghost bg-card shadow-lg" onClick={() => setOpen(true)}>
            <Timer size={16} /> {running ? `${mm}:${ss}` : "Minuteur"}
          </button>
        )}
      </div>
    </>
  );
}
