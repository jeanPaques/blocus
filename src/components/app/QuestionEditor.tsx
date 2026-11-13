import { useState } from "react";
import { Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { editQuestion, setState, type Question } from "@/lib/store";

export function QuestionEditor({ question }: { question: Question }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" className="no-print shrink-0" title="Modifier la question" aria-label="Modifier la question" onClick={() => { setPrompt(question.question); setAnswer(question.answer); setOpen(true); }}><Pencil size={16} /></Button>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogTitle>Modifier la question</DialogTitle>
        <DialogDescription>{question.subject}</DialogDescription>
        <form className="grid min-w-0 gap-4" onSubmit={(e) => { e.preventDefault(); setState((s) => editQuestion(s, question.id, prompt, answer)); setOpen(false); }}>
          <label className="grid gap-1">Énoncé<textarea required className="min-h-36 w-full rounded-md border bg-background p-3 font-mono text-sm" value={prompt} onChange={(e) => setPrompt(e.target.value)} /></label>
          <label className="grid gap-1">Réponse<textarea required className="min-h-44 w-full rounded-md border bg-background p-3 font-mono text-sm" value={answer} onChange={(e) => setAnswer(e.target.value)} /></label>
          <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" disabled={!prompt.trim() || !answer.trim()}><Save size={16} />Enregistrer</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}