import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Eye, CloudCheck, ArrowLeft } from "lucide-react";
import { useApp, autoOrder, grade } from "@/lib/store";
import { RichText } from "@/components/app/RichText";

export const Route = createFileRoute("/reviser/$sessionId")({
  validateSearch: (s: Record<string, unknown>): { matiere?: string } => (typeof s.matiere === "string" ? { matiere: s.matiere } : {}),
  head: () => ({
    meta: [
      { title: "Révision – Blocus" },
      { name: "description", content: "Lis la question, affiche la réponse et évalue-toi." },
      { property: "og:title", content: "Révision – Blocus" },
      { property: "og:description", content: "Questions-réponses avec auto-évaluation." },
    ],
  }),
  component: Review,
});

function Review() {
  const { sessionId } = Route.useParams();
  const { matiere } = Route.useSearch();
  const app = useApp();
  const session = app.sessions.find((s) => s.id === sessionId);
  const title = sessionId === "erreurs" ? "Carnet d'erreurs" : session?.name ?? "Session";

  // Freeze the order at start so grading doesn't reshuffle the deck mid-session.
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    const pool = app.questions.filter((q) => (sessionId === "erreurs" ? q.wrong > 0 : q.sessionId === sessionId) && (!matiere || q.subject === matiere));
    setIds(autoOrder(pool).map((q) => q.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, matiere]);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const q = useMemo(() => app.questions.find((x) => x.id === ids?.[i]), [app.questions, ids, i]);

  const answer = (r: "right" | "wrong") => {
    if (!q || !shown) return;
    grade(q.id, r);
    setScore((s) => ({ ...s, [r]: s[r] + 1 }));
    setShown(false);
    setI((n) => n + 1);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if (!shown && (k === " " || k === "enter")) { e.preventDefault(); setShown(true); }
      else if (shown && (k === "f" || k === "1")) answer("wrong");
      else if (shown && (k === "v" || k === "2")) answer("right");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (!ids) return null;
  const total = ids.length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={14} />Mes sessions</Link>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">{title}{matiere ? ` · ${matiere}` : ""}</h1>
        <span className="text-sm tabular-nums text-muted-foreground">{Math.min(i + 1, total)} / {total}</span>
      </div>
      <div className="mb-6 h-1 overflow-hidden rounded bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${total ? (i / total) * 100 : 0}%` }} /></div>

      {total === 0 ? (
        <div className="paper rounded-xl py-10 pl-16 pr-6">
          <p className="text-lg">Aucune question ici pour l'instant.</p>
          <Link to="/importer" className="btn btn-primary mt-4">Ajouter des questions</Link>
        </div>
      ) : !q ? (
        <div className="paper rounded-xl py-10 pl-16 pr-6">
          <h2 className="text-3xl font-semibold">Bravo, série terminée !</h2>
          <p className="mt-3 text-lg leading-8"><span className="text-success">{score.right} bonnes</span> · <span className="text-destructive">{score.wrong} à revoir</span></p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={() => { setIds(autoOrder(app.questions.filter((x) => ids.includes(x.id))).map((x) => x.id)); setI(0); setScore({ right: 0, wrong: 0 }); }}>Recommencer</button>
            <Link to="/carnet" className="btn btn-ghost">Voir mon carnet d'erreurs</Link>
          </div>
        </div>
      ) : (
        <>
          <article className="paper rounded-xl py-6 pl-16 pr-6">
            <p className="text-sm uppercase tracking-wider text-muted-foreground leading-8">{q.subject}{q.seen === 0 ? " · nouvelle" : q.last === "wrong" ? " · à revoir" : ""}</p>
            <RichText text={q.question} className="font-serif text-xl md:text-2xl" />
            {shown && (
              <div className="mt-4 border-t-2 border-dashed pt-4 animate-in fade-in slide-in-from-bottom-2">
                <p className="font-serif text-lg italic text-primary leading-8">Correction</p>
                <RichText text={q.answer} className="text-lg" />
              </div>
            )}
          </article>
          <div className="mt-6">
            {!shown ? (
              <button className="btn btn-primary w-full !py-4 text-lg" onClick={() => setShown(true)}><Eye size={20} />Afficher la réponse</button>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button className="btn btn-danger !py-4 text-lg" onClick={() => answer("wrong")}><X size={20} />J'avais faux</button>
                <button className="btn btn-success !py-4 text-lg" onClick={() => answer("right")}><Check size={20} />J'avais bon</button>
              </div>
            )}
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><CloudCheck size={14} />Progression enregistrée automatiquement</span>
              <span>Espace : afficher · F ou 1 : faux · V ou 2 : bon</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
