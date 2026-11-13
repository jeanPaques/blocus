import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export const PROMPT = `Agis comme un professeur universitaire à l'ULB. À partir du document joint, génère une série de questions-réponses au format suivant, sans texte superflu :
---
### Matière : [Nom de la matière]
### Question
[Énoncé précis, avec formules LaTeX $$...$$ ou code Python si pertinent]
### Réponse
[Correction officielle claire, rigoureuse et détaillée]
---`;

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Créer mes questions avec l'IA – Blocus" },
      { name: "description", content: "Guide pas à pas pour générer tes questions de révision avec ChatGPT ou Claude." },
      { property: "og:title", content: "Créer mes questions avec l'IA – Blocus" },
      { property: "og:description", content: "Copie le prompt magique, dépose ton cours, importe le résultat." },
    ],
  }),
  component: Guide,
});

function Guide() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const steps = [
    { t: "Ouvre ChatGPT ou Claude", d: <>Va sur <a className="text-primary underline" href="https://chatgpt.com" target="_blank" rel="noreferrer">chatgpt.com</a> ou <a className="text-primary underline" href="https://claude.ai" target="_blank" rel="noreferrer">claude.ai</a>.</> },
    { t: "Copie le prompt magique", d: <button className="btn btn-primary mt-2" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copié !" : "Copier le prompt magique"}</button> },
    { t: "Dépose ton PDF de cours et colle le prompt", d: "Glisse ton fichier de cours dans la conversation, colle le texte (Ctrl+V) puis envoie." },
    { t: "Copie le résultat et colle-le dans « Importer »", d: <Link to="/importer" className="text-primary underline">Aller à l'onglet Importer →</Link> },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-semibold">Créer mes questions avec l'IA</h1>
      <p className="mt-1 text-muted-foreground">Quatre étapes, environ deux minutes.</p>
      <ol className="mt-8 space-y-6">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-serif text-xl italic text-primary-foreground">{i + 1}</span>
            <div className="pt-1.5"><h2 className="text-xl font-semibold">{s.t}</h2><div className="mt-1 text-muted-foreground">{s.d}</div></div>
          </li>
        ))}
      </ol>
      <h2 className="mt-10 text-xl font-semibold">Le prompt magique</h2>
      <pre className="paper mt-2 whitespace-pre-wrap rounded-xl py-4 pl-16 pr-4 font-mono text-sm leading-8">{PROMPT}</pre>
    </div>
  );
}
