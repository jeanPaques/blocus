import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Timer, Check, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/app/RichText";
import { useApp, setState, selectQuestions, type Result } from "@/lib/store";
import { chooseExamQuestions, examRemaining, examScore, finishExam, saveExamResults, type ExamAttempt } from "@/lib/exam";

export const Route = createFileRoute("/examen/$sessionId")({
  validateSearch: (s: Record<string, unknown>): { matiere?: string | undefined } => typeof s["matiere"] === "string" ? { matiere: s["matiere"] } : {},
  head: () => ({ meta: [
    { title: "Examen blanc chronométré – Blocus" },
    { name: "description", content: "Prépare ton examen blanc, rédige tes réponses et corrige-toi à la fin de l'épreuve." },
    { property: "og:title", content: "Examen blanc chronométré – Blocus" },
    { property: "og:description", content: "Une épreuve par session ou matière, avec temps imparti et note indicative sur 20." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Exam,
});

const duration = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, "0")}`;

function Exam() {
  const { sessionId } = Route.useParams();
  const { matiere } = Route.useSearch();
  const app = useApp();
  const session = app.sessions.find((s) => s.id === sessionId);
  const pool = selectQuestions(app, { sessionId, subject: matiere });
  const stored = app.examAttempt;
  const attempt = stored?.sessionId === sessionId && stored.subject === matiere ? stored : undefined;
  const [count, setCount] = useState("5");
  const [minutes, setMinutes] = useState("30");
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(0);
  const [corrections, setCorrections] = useState(false);
  const update = (fn: (a: ExamAttempt) => ExamAttempt) => setState((s) => s.examAttempt ? { ...s, examAttempt: fn(s.examAttempt) } : s);

  useEffect(() => {
    if (!attempt || attempt.finishedAt !== undefined) return;
    const tick = () => {
      const time = Date.now(); setNow(time);
      if (attempt.deadline !== null && time >= attempt.deadline) {
        setState((s) => s.examAttempt && s.examAttempt.finishedAt === undefined ? { ...s, examAttempt: finishExam(s.examAttempt, time) } : s);
      }
    };
    tick(); const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [attempt?.startedAt, attempt?.deadline, attempt?.finishedAt]);

  const start = () => {
    if (stored && !stored.saved && !confirm("Remplacer l’examen en cours et ses réponses ?")) return;
    const time = Date.now();
    setState((s) => ({ ...s, examAttempt: {
      sessionId, ...(matiere ? { subject: matiere } : {}),
      ids: chooseExamQuestions(pool, count === "all" ? pool.length : Number(count)),
      responses: {}, results: {}, startedAt: time, deadline: minutes === "0" ? null : time + Number(minutes) * 60000,
    } }));
    setIndex(0); setNow(time); setCorrections(false);
  };

  const complete = attempt?.finishedAt !== undefined;
  const graded = attempt ? attempt.ids.filter((id) => attempt.results[id]).length : 0;
  const q = attempt ? app.questions.find((q) => q.id === attempt.ids[index]) : undefined;
  const remaining = attempt ? examRemaining(attempt, now || Date.now()) : null;
  const mark = (result: Result) => {
    if (!q || !attempt || attempt.saved) return;
    update((a) => ({ ...a, results: { ...a.results, [q.id]: result } }));
    if (index < attempt.ids.length - 1) setIndex(index + 1);
  };

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft size={14} />Mes sessions</Link>
      <h1 className="text-3xl font-semibold">Examen blanc</h1>
      <p className="mt-1 break-words text-muted-foreground">{session?.name ?? "Session introuvable"}{matiere ? ` · ${matiere}` : " · Toutes les matières"}</p>
      {!attempt ? (
        <div className="mt-8 border-t pt-6">
          {stored && !stored.saved && <p className="mb-4 text-sm text-muted-foreground">Un autre examen est en attente. <Link to="/examen/$sessionId" params={{ sessionId: stored.sessionId }} search={{ matiere: stored.subject }} className="text-primary underline">Reprendre cet examen</Link></p>}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2">Nombre de questions<select className="rounded-md border bg-background p-3" value={count} onChange={(e) => setCount(e.target.value)}>{[5, 10, 20].map((n) => <option key={n} value={n}>{n} questions{pool.length < n ? ` (${pool.length} disponibles)` : ""}</option>)}<option value="all">Toutes ({pool.length})</option></select></label>
            <label className="grid gap-2">Temps imparti<select className="rounded-md border bg-background p-3" value={minutes} onChange={(e) => setMinutes(e.target.value)}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 heure</option><option value="0">Sans chrono</option></select></label>
          </div>
          <Button className="mt-6 h-auto whitespace-normal py-3" disabled={!session || !pool.length} onClick={start}><Timer size={18} />Commencer l’examen</Button>
          {!pool.length && <p className="mt-4 text-muted-foreground">Aucune question dans cette sélection.</p>}
        </div>
      ) : (
        <>
          {complete ? (
            <section className="mt-6 border-y py-6">
              <h2 className="text-2xl font-semibold">Épreuve terminée</h2>
              <p className="mt-2 text-muted-foreground">Temps passé : {duration(Math.max(0, (attempt.finishedAt ?? now) - attempt.startedAt))}{attempt.deadline !== null && (attempt.finishedAt ?? 0) >= attempt.deadline ? " · Temps écoulé" : ""}</p>
              {graded === attempt.ids.length ? <p className="mt-3 font-serif text-4xl">{examScore(attempt).toLocaleString("fr-BE", { maximumFractionDigits: 1 })} / 20 <span className="font-sans text-sm text-muted-foreground">Note indicative · auto-évaluation</span></p> : <p className="mt-3">Correction : {graded} / {attempt.ids.length}</p>}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => { setCorrections(!corrections); setIndex(0); }}>{corrections ? "Masquer la correction" : "Revoir la correction"}</Button>
                {graded === attempt.ids.length && <Button disabled={attempt.saved} className="h-auto whitespace-normal" onClick={() => setState((s) => saveExamResults(s, s.examAttempt ?? attempt))}><Save size={16} />{attempt.saved ? "Résultats enregistrés" : "Enregistrer et ajouter les erreurs au carnet"}</Button>}
                {attempt.saved && <><Button asChild variant="outline"><Link to="/carnet" search={{ session: sessionId, matiere }}>Carnet d’erreurs</Link></Button><Button variant="ghost" onClick={() => { setState((s) => ({ ...s, examAttempt: undefined })); setIndex(0); setCorrections(false); }}>Nouvel examen</Button></>}
              </div>
            </section>
          ) : (
            <div className="sticky top-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-y bg-background py-3">
              <span className="tabular-nums">Question {index + 1} / {attempt.ids.length}</span>
              <span className={`inline-flex items-center gap-2 font-mono text-xl tabular-nums ${remaining !== null && remaining < 60000 ? "text-destructive" : "text-primary"}`}><Timer size={18} />{remaining === null ? "Sans chrono" : duration(remaining)}</span>
            </div>
          )}
          {(!complete || corrections) && q && (
            <>
              <article className="paper mt-6 rounded-lg py-6 pl-16 pr-6">
                <p className="text-sm text-muted-foreground">{q.subject}{complete ? ` · Question ${index + 1} / ${attempt.ids.length}` : ""}</p>
                <RichText text={q.question} className="mt-2 font-serif text-xl" />
              </article>
              <label className="mt-5 grid gap-2">Ta réponse<textarea className="min-h-40 w-full rounded-md border bg-background p-3" value={attempt.responses[q.id] ?? ""} readOnly={complete} onChange={(e) => update((a) => ({ ...a, responses: { ...a.responses, [q.id]: e.target.value } }))} /></label>
              {complete && <div className="mt-6 border-t pt-4"><h3 className="mb-2 text-xl text-primary">Correction</h3><RichText text={q.answer} /><div className="mt-4 grid grid-cols-2 gap-3"><Button className="btn btn-danger h-auto whitespace-normal py-3" disabled={attempt.saved} aria-pressed={attempt.results[q.id] === "wrong"} onClick={() => mark("wrong")}><X />J’avais faux</Button><Button className="btn btn-success h-auto whitespace-normal py-3" disabled={attempt.saved} aria-pressed={attempt.results[q.id] === "right"} onClick={() => mark("right")}><Check />J’avais bon</Button></div>{attempt.results[q.id] && <p className="mt-2 text-sm text-muted-foreground">Évaluation : {attempt.results[q.id] === "right" ? "bonne réponse" : "à revoir"}</p>}</div>}
              <div className="mt-5 flex items-center justify-between gap-3">
                <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft />Précédente</Button>
                <Button variant="outline" disabled={index >= attempt.ids.length - 1} onClick={() => setIndex(index + 1)}>Suivante<ArrowRight /></Button>
              </div>
              {!complete && <Button className="mt-6 w-full" onClick={() => { if (confirm("Terminer l’épreuve et passer à la correction ?")) { update((a) => finishExam(a, Date.now())); setIndex(0); } }}>Terminer l’épreuve</Button>}
            </>
          )}
          {!q && !complete && <p className="mt-6 text-muted-foreground">Cette question a été supprimée.</p>}
        </>
      )}
    </div>
  );
}