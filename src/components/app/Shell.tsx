import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Sparkles, Upload, NotebookPen, Moon, Sun, Download, X } from "lucide-react";
import { Pomodoro } from "./Pomodoro";

const nav = [
  { to: "/", label: "Mes sessions", icon: BookOpen },
  { to: "/guide", label: "Guide & IA", icon: Sparkles },
  { to: "/importer", label: "Importer & partager", icon: Upload },
  { to: "/carnet", label: "Carnet d'erreurs", icon: NotebookPen },
] as const;

interface InstallEvent extends Event { prompt: () => Promise<void> }

export function Shell({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const d = localStorage.getItem("blocus-dark") === "1";
    setDark(d);
    const h = (e: Event) => { e.preventDefault(); if (!localStorage.getItem("blocus-install-hidden")) setInstall(e as InstallEvent); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("blocus-dark", dark ? "1" : "0");
  }, [dark]);

  return (
    <div className="min-h-screen">
      {install && (
        <div className="no-print flex items-center justify-center gap-3 bg-secondary px-4 py-2 text-sm">
          <Download size={14} />
          <button className="underline underline-offset-4" onClick={() => install.prompt().then(() => setInstall(null))}>Installer sur mon ordinateur</button>
          <button aria-label="Masquer" onClick={() => { localStorage.setItem("blocus-install-hidden", "1"); setInstall(null); }}><X size={14} /></button>
        </div>
      )}
      <header className="no-print border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="font-serif text-2xl font-semibold italic text-primary">Blocus</Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
                activeProps={{ className: "bg-secondary !text-foreground font-medium" }}>
                <Icon size={15} />{label}
              </Link>
            ))}
          </nav>
          <button className="btn btn-ghost !p-2" onClick={() => setDark(!dark)} aria-label={dark ? "Mode clair" : "Mode soir"}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <Pomodoro />
    </div>
  );
}
