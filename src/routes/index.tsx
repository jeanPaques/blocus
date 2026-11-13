import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Play, Trash2, History, X, FolderPlus } from "lucide-react";
import { useApp, setState, uid, getBackups, restoreBackup, type Backup } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mes sessions d'examen – Blocus" },
      { name: "description", content: "Choisis ta session d'examen et révise en questions-réponses avec auto-évaluation." },
      { property: "og:title", content: "Mes sessions d'examen – Blocus" },
      { property: "og:description", content: "Révise tes examens BA1 Informatique ULB, sans compte, directement dans ton navigateur." },
    ],
  }),
  component: Home,
});

function Welcome() {
  const steps = [
    "Choisis ta session d'examen (une session d'essai est déjà prête).",
    "Lis la question, réfléchis, puis clique sur « Afficher la réponse ».",
    "Dis si tu avais bon ou faux : tes révisions s'adaptent toutes seules !",
  ];
  return (
    <section className="paper relative mb-10 rounded-xl py-6 pl-16 pr-6">
      <button className="absolute right-4 top-4 text-muted-foreground" aria-label="Fermer" onClick={() => setState((s) => ({ ...s, onboarded: true }))}><X size={18} /></button>
      <h1 className="text-3xl font-semibold">Bienvenue ! On commence en 3 étapes.</h1>
      <ol className="mt-4 space-y-2 leading-8">
        {steps.map((t, i) => (
          <li key={i} className="flex gap-3"><span className="font-serif text-xl italic text-primary">{i + 1}.</span>{t}</li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted-foreground">Rien à configurer, pas de compte : tout est enregistré automatiquement sur cet appareil.</p>
    </section>
  );
}

function Home() {
  const app = useApp();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [backups, setBackups] = useState<Backup[] | null>(null);

  const addSession = () => {
    if (!name.trim()) return;
    setState((s) => ({ ...s, sessions: [...s.sessions, { id: uid(), name: name.trim(), subjects: [], createdAt: Date.now() }] }));
    setName("");
  };
  const addSubject = (id: string) => {
    if (!subject.trim()) return;
    setState((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, subjects: Array.from(new Set([...x.subjects, subject.trim()])) } : x)) }));
    setSubject(""); setAdding(null);
  };
  const delSession = (id: string, n: string) => {
    if (!confirm(`Supprimer la session « ${n} » et toutes ses questions ?\n\nTu pourras la récupérer via « Revenir en arrière ».`)) return;
    setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id), questions: s.questions.filter((q) => q.sessionId !== id) }));
  };

  return (
    <div>
      {!app.onboarded && <Welcome />}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-semibold">Mes sessions d'examen</h2>
          <p className="text-muted-foreground">Sessions → matières → questions.</p>
        </div>
        <button className="btn btn-ghost text-sm" onClick={() => setBackups(getBackups())}><History size={15} />Revenir en arrière</button>
      </div>

      {backups && (
        <div className="mb-6 rounded-xl border bg-card p-4">
          <div className="mb-2 flex justify-between"><strong>Dernières sauvegardes automatiques</strong><button onClick={() => setBackups(null)} aria-label="Fermer"><X size={16} /></button></div>
          {backups.length === 0 ? <p className="text-sm text-muted-foreground">Pas encore de sauvegarde précédente.</p> : (
            <ul className="space-y-2">
              {backups.map((b) => (
                <li key={b.at} className="flex items-center justify-between gap-2 text-sm">
                  <span>{new Date(b.at).toLocaleString("fr-BE")} — {b.state.questions.length} questions</span>
                  <button className="btn btn-ghost !py-1 text-sm" onClick={() => { if (confirm("Revenir à cette sauvegarde ?")) { restoreBackup(b); setBackups(null); } }}>Restaurer</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {app.sessions.map((se) => {
          const qs = app.questions.filter((q) => q.sessionId === se.id);
          const subjects = Array.from(new Set([...se.subjects, ...qs.map((q) => q.subject)]));
          const mastered = qs.filter((q) => q.last === "right").length;
          return (
            <article key={se.id} className="paper rounded-xl py-5 pl-16 pr-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-2xl font-semibold leading-8">{se.name}</h3>
                <button className="text-muted-foreground hover:text-destructive" aria-label="Supprimer la session" onClick={() => delSession(se.id, se.name)}><Trash2 size={16} /></button>
              </div>
              <p className="text-sm leading-8 text-muted-foreground">{qs.length} questions · {mastered} maîtrisées</p>
              <div className="h-1.5 overflow-hidden rounded bg-secondary"><div className="h-full bg-success" style={{ width: `${qs.length ? (mastered / qs.length) * 100 : 0}%` }} /></div>
              <ul className="mt-3 leading-8">
                {subjects.map((m) => (
                  <li key={m} className="flex items-center justify-between">
                    <span>{m} <span className="text-sm text-muted-foreground">({qs.filter((q) => q.subject === m).length})</span></span>
                    <Link to="/reviser/$sessionId" params={{ sessionId: se.id }} search={{ matiere: m }} className="text-sm text-primary hover:underline">Réviser</Link>
                  </li>
                ))}
              </ul>
              {adding === se.id ? (
                <div className="mt-2 flex gap-2">
                  <input autoFocus className="flex-1 rounded-md border bg-background px-3 py-1.5" placeholder="Ex. Systèmes" value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubject(se.id)} />
                  <button className="btn btn-primary !py-1.5" onClick={() => addSubject(se.id)}>OK</button>
                </div>
              ) : (
                <button className="mt-1 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => { setAdding(se.id); setSubject(""); }}><FolderPlus size={14} />Ajouter une matière</button>
              )}
              <Link to="/reviser/$sessionId" params={{ sessionId: se.id }} search={{}} className="btn btn-primary mt-4 w-full"><Play size={16} />Session automatique</Link>
            </article>
          );
        })}
        <div className="flex flex-col justify-center gap-3 rounded-xl border-2 border-dashed p-6">
          <label className="font-serif text-xl" htmlFor="ns">Nouvelle session</label>
          <input id="ns" className="rounded-md border bg-background px-3 py-2" placeholder="Ex. Juin 2023" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSession()} />
          <button className="btn btn-ghost" onClick={addSession}><Plus size={16} />Nouvelle session</button>
        </div>
      </div>
    </div>
  );
}
