import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Share2, FileDown, FileUp } from "lucide-react";
import { useApp, setState, parseImport, uid, buildShare, mergeShare, download, type ShareFile } from "@/lib/store";

export const Route = createFileRoute("/importer")({
  head: () => ({
    meta: [
      { title: "Importer & partager – Blocus" },
      { name: "description", content: "Ajoute les questions générées par l'IA et partage tes révisions avec tes amis." },
      { property: "og:title", content: "Importer & partager – Blocus" },
      { property: "og:description", content: "Colle tes questions, ou charge le fichier de révision d'un ami." },
    ],
  }),
  component: Importer,
});

function Importer() {
  const app = useApp();
  const [text, setText] = useState("");
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState("");
  const parsed = useMemo(() => parseImport(text), [text]);
  const sessionId = target || app.sessions[0]?.id || "";

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
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, subjects: Array.from(new Set([...x.subjects, ...parsed.map((p) => p.subject)])) } : x)),
      questions: [...s.questions, ...parsed.map((p) => ({ ...p, id: uid(), sessionId, seen: 0, right: 0, wrong: 0 }))],
    }));
    setMsg(`${parsed.length} questions ajoutées !`);
    setText("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <section>
        <h1 className="text-4xl font-semibold">Importer des questions</h1>
        <p className="mt-1 text-muted-foreground">Colle ici le texte donné par l'IA, ou glisse un fichier texte.</p>
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
            <select className="rounded-md border bg-background px-2 py-1.5" value={sessionId} onChange={(e) => setTarget(e.target.value)}>
              {app.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn btn-success" onClick={add} disabled={!sessionId}>Ajouter</button>
          </div>
        )}
        {text && parsed.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Aucune question reconnue pour l'instant. Vérifie que le texte contient « ### Question » et « ### Réponse ».</p>}
        {msg && <p className="mt-3 font-medium text-success">{msg}</p>}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-3xl font-semibold"><Share2 size={22} />Partager avec des amis</h2>
        <p className="mt-1 text-muted-foreground">Un fichier à envoyer sur WhatsApp, Discord ou par e-mail.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <button className="btn btn-primary !py-4" onClick={() => download(`revisions-blocus-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(buildShare(app), null, 1))}>
            <FileDown size={18} />Télécharger mes questions pour un ami
          </button>
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
