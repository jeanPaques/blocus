import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Share2, FileDown, FileUp } from "lucide-react";
import { useApp, setState, parseImport, importQuestions, sessionSubjects, buildShare, mergeShare, download, type ShareFile } from "@/lib/store";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/importer")({
  validateSearch: (s: Record<string, unknown>): { session?: string | undefined; matiere?: string | undefined } => ({
    ...(typeof s["session"] === "string" ? { session: s["session"] } : {}),
    ...(typeof s["matiere"] === "string" ? { matiere: s["matiere"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Importer & partager – Blocus" },
      { name: "description", content: "Ajoute les questions générées par l'IA et partage tes révisions avec tes amis." },
      { property: "og:title", content: "Importer & partager – Blocus" },
      { property: "og:description", content: "Colle tes questions, ou charge le fichier de révision d'un ami." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Importer,
});

function Importer() {
  const app = useApp();
  const search = Route.useSearch();
  const [text, setText] = useState("");
  const [target, setTarget] = useState(search.session ?? "");
  const [subject, setSubject] = useState(search.matiere ?? "");
  const [msg, setMsg] = useState("");
  const parsed = useMemo(() => parseImport(text), [text]);
  const sessionId = app.sessions.some((s) => s.id === target) ? target : app.sessions[0]?.id || "";
  const subjects = sessionSubjects(app, sessionId);

  const readFile = (f: File) => f.text().then((t) => {
    try {
      const j = JSON.parse(t) as ShareFile;
      if (j.kind === "blocus-share") return loadFriend(j);
    } catch { /* plain text */ }
    setText(t);
  });
  const loadFriend = (f: ShareFile) => {
    let n = 0;
    setState((s) => { const r = mergeShare(s, f); n = r.added; return r.state; });
    setMsg(`${n} nouvelles questions ajoutées. Ta progression est intacte.`);
  };
  const add = () => {
    if (!sessionId) return;
    setState((s) => importQuestions(s, sessionId, parsed, subject));
    setMsg(`${parsed.length} questions ajoutées dans « ${app.sessions.find((s) => s.id === sessionId)?.name} »${subject.trim() ? ` · ${subject.trim()}` : ""}.`);
    setText("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <section>
        <h1 className="text-4xl font-semibold">Importer des questions</h1>
        <p className="mt-1 text-muted-foreground">Colle ici le texte donné par l'IA, ou glisse un fichier texte.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="import-session" className="mb-1 block font-medium">Session d’examen</label>
            <select id="import-session" className="w-full min-w-0 rounded-md border bg-background px-3 py-2" value={sessionId} onChange={(e) => { setTarget(e.target.value); setSubject(""); setMsg(""); }}>
              {!app.sessions.length && <option value="">Aucune session</option>}
              {app.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label htmlFor="import-subject" className="mb-1 block font-medium">Matière</label>
            <input id="import-subject" list="import-subjects" className="w-full min-w-0 rounded-md border bg-background px-3 py-2" placeholder="Matières du texte" value={subject} onChange={(e) => { setSubject(e.target.value); setMsg(""); }} disabled={!sessionId} />
            <datalist id="import-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
        </div>
        <textarea
          className="paper mt-4 min-h-64 w-full rounded-xl py-1 pl-16 pr-4 font-mono text-sm leading-8 outline-none focus:ring-2 focus:ring-ring"
          placeholder={"### Matière : Algorithmique\n### Question\n...\n### Réponse\n..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
        />
        {parsed.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-3">
            <CheckCircle2 className="text-success" size={20} />
            <span className="flex-1 font-medium">{parsed.length} question{parsed.length > 1 ? "s" : ""} détectée{parsed.length > 1 ? "s" : ""} prête{parsed.length > 1 ? "s" : ""} à être ajoutée{parsed.length > 1 ? "s" : ""}</span>
            <Button className="btn btn-success h-auto whitespace-normal" onClick={add} disabled={!sessionId}>Ajouter</Button>
          </div>
        )}
        {parsed.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{subject.trim() ? `Matière : ${subject.trim()}` : `Matières du texte : ${Array.from(new Set(parsed.map((p) => p.subject))).join(", ")}`}</p>}
        {text && parsed.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Aucune question reconnue pour l'instant. Vérifie que le texte contient « ### Question » et « ### Réponse ».</p>}
        {msg && <p className="mt-3 font-medium text-success">{msg}</p>}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-3xl font-semibold"><Share2 size={22} />Partager avec des amis</h2>
        <p className="mt-1 text-muted-foreground">Un fichier à envoyer sur WhatsApp, Discord ou par e-mail.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
           <Button className="btn btn-primary h-auto whitespace-normal !py-4" onClick={() => download(`revisions-blocus-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(buildShare(app), null, 1))}>
            <FileDown size={18} />Télécharger mes questions pour un ami
           </Button>
          <label className="btn btn-ghost cursor-pointer !py-4">
            <FileUp size={18} />Charger les questions d'un ami
            <input type="file" accept=".json,.txt,.md" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ""; }} />
          </label>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Les questions de ton ami s'ajoutent aux tiennes, sans rien effacer.</p>
      </section>
    </div>
  );
}
