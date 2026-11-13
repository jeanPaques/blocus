import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer, Play } from "lucide-react";
import { useApp } from "@/lib/store";
import { RichText } from "@/components/app/RichText";

export const Route = createFileRoute("/carnet")({
  head: () => ({
    meta: [
      { title: "Carnet d'erreurs – Blocus" },
      { name: "description", content: "Toutes les questions ratées au moins une fois, à relire ou imprimer." },
      { property: "og:title", content: "Carnet d'erreurs – Blocus" },
      { property: "og:description", content: "Relis et imprime tes questions ratées." },
    ],
  }),
  component: Carnet,
});

function Carnet() {
  const app = useApp();
  const qs = app.questions.filter((q) => q.wrong > 0).sort((a, b) => b.wrong - a.wrong);
  const sessionName = (id: string) => app.sessions.find((s) => s.id === id)?.name ?? "";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Carnet d'erreurs</h1>
          <p className="text-muted-foreground">{qs.length} question{qs.length > 1 ? "s" : ""} ratée{qs.length > 1 ? "s" : ""} au moins une fois.</p>
        </div>
        {qs.length > 0 && (
          <div className="no-print flex gap-2">
            <Link to="/reviser/$sessionId" params={{ sessionId: "erreurs" }} search={{}} className="btn btn-primary"><Play size={16} />Réviser</Link>
            <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} />Imprimer / Exporter en PDF</button>
          </div>
        )}
      </div>
      {qs.length === 0 ? (
        <p className="paper rounded-xl py-8 pl-16 pr-6 leading-8">Aucune erreur pour l'instant. Les questions où tu cliques « J'avais faux » apparaîtront ici.</p>
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
