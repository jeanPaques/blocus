import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, Play } from "lucide-react";
import { useApp, selectQuestions, sessionSubjects } from "@/lib/store";
import { RichText } from "@/components/app/RichText";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/carnet")({
  validateSearch: (s: Record<string, unknown>): { session?: string | undefined; matiere?: string | undefined } => ({
    ...(typeof s["session"] === "string" ? { session: s["session"] } : {}),
    ...(typeof s["matiere"] === "string" ? { matiere: s["matiere"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Carnet d'erreurs – Blocus" },
      { name: "description", content: "Toutes les questions ratées au moins une fois, à relire ou imprimer." },
      { property: "og:title", content: "Carnet d'erreurs – Blocus" },
      { property: "og:description", content: "Relis et imprime tes questions ratées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Carnet,
});

function Carnet() {
  const app = useApp();
  const { session, matiere } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qs = selectQuestions(app, { sessionId: session, subject: matiere, errorsOnly: true }).sort((a, b) => b.wrong - a.wrong);
  const total = selectQuestions(app, { errorsOnly: true }).length;
  const subjects = session ? sessionSubjects(app, session) : Array.from(new Set(app.questions.map((q) => q.subject))).sort();
  const sessionName = (id: string) => app.sessions.find((s) => s.id === id)?.name ?? "";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Carnet d'erreurs</h1>
          <p className="text-muted-foreground">{qs.length} question{qs.length > 1 ? "s" : ""} ratée{qs.length > 1 ? "s" : ""} au moins une fois{session || matiere ? ` · ${total} au total` : ""}.</p>
          {(session || matiere) && <p className="mt-1 text-sm text-primary">{session ? sessionName(session) : "Toutes les sessions"} · {matiere || "Toutes les matières"}</p>}
        </div>
        {qs.length > 0 && (
          <div className="no-print flex gap-2">
            <Button asChild className="btn btn-primary h-auto"><Link to="/reviser/$sessionId" params={{ sessionId: "erreurs" }} search={{ session, matiere }}><Play size={16} />Réviser</Link></Button>
            <Button variant="outline" className="btn btn-ghost h-auto whitespace-normal" onClick={() => window.print()}><Printer size={16} />Imprimer / Exporter en PDF</Button>
          </div>
        )}
      </div>
      <div className="no-print mb-6 grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="error-session" className="mb-1 block font-medium">Session</label>
          <select id="error-session" className="w-full rounded-md border bg-background px-3 py-2" value={session ?? ""} onChange={(e) => navigate({ search: { session: e.target.value || undefined, matiere: undefined } })}>
            <option value="">Toutes les sessions</option>
            {app.sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="error-subject" className="mb-1 block font-medium">Matière</label>
          <select id="error-subject" className="w-full rounded-md border bg-background px-3 py-2" value={matiere ?? ""} onChange={(e) => navigate({ search: { session, matiere: e.target.value || undefined } })}>
            <option value="">Toutes les matières</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {(session || matiere) && <Button variant="ghost" className="justify-self-start" onClick={() => navigate({ search: {} })}>Toutes les erreurs</Button>}
      </div>
      {qs.length === 0 ? (
        <p className="paper rounded-xl py-8 pl-16 pr-6 leading-8">{total ? "Aucune erreur pour cette sélection." : "Aucune erreur pour l'instant. Les questions où tu cliques « J'avais faux » apparaîtront ici."}</p>
      ) : (
        <div className="space-y-5">
          {qs.map((q) => (
            <article key={q.id} className="paper print-card rounded-xl py-4 pl-16 pr-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground leading-8">{sessionName(q.sessionId)} · {q.subject} · ratée {q.wrong}×</p>
              <RichText text={q.question} className="font-serif text-lg" />
              <div className="border-t border-dashed pt-2"><RichText text={q.answer} /></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
