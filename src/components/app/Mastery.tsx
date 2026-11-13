import { mastery, type Question } from "@/lib/store";

export function Mastery({ questions }: { questions: Question[] }) {
  const m = mastery(questions);
  return (
    <div className="my-2 min-w-0">
      <p className="text-xs tabular-nums text-muted-foreground">{m.right} / {m.total} maîtrisées ({m.percent} %) · {m.wrong} à revoir · {m.unseen} non vues</p>
      <div className="mt-1.5 flex h-1.5 overflow-hidden rounded bg-secondary" role="img" aria-label={`${m.right} maîtrisées, ${m.wrong} à revoir, ${m.unseen} non vues`}>
        <div className="h-full bg-success" style={{ width: `${m.total ? m.right / m.total * 100 : 0}%` }} />
        <div className="h-full bg-destructive" style={{ width: `${m.total ? m.wrong / m.total * 100 : 0}%` }} />
      </div>
    </div>
  );
}