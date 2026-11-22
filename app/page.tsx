"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Job } from "@/lib/types";

const DEFAULT_TEXT = `La photosynthèse est le processus par lequel les plantes transforment la lumière du soleil en énergie chimique. Dans les feuilles, la chlorophylle absorbe la lumière et utilise l'eau puisée dans les racines ainsi que le dioxyde de carbone présent dans l'air. Cette réaction produit du glucose, qui nourrit la plante, et du dioxygène, libéré dans l'atmosphère. Sans la photosynthèse, la plupart des chaînes alimentaires terrestres ne pourraient pas exister.`;

const STEPS = [
  { key: "storyboard", label: "Claude rédige le storyboard" },
  { key: "audio", label: "Génération de la voix off" },
  { key: "rendering", label: "Rendu de la vidéo" },
];

function stepIndex(status: Job["status"] | undefined): number {
  if (!status) return -1;
  if (status === "storyboard") return 0;
  if (status === "audio") return 1;
  if (status === "rendering") return 2;
  return 3;
}

export default function HomePage() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [language, setLanguage] = useState("fr");
  const [voice, setVoice] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!jobId || job?.status === "done" || job?.status === "error") return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`);
        if (response.ok) setJob((await response.json()) as Job);
      } catch {
        // Keep polling: a transient network error is not a generation failure.
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [jobId, job?.status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setJob(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, voice }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error ?? "Impossible de lancer la génération.");
      setJobId(data.id);
      setJob({ id: data.id, status: "queued", progress: 0, message: "File d'attente", createdAt: Date.now() });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  }

  const activeStep = stepIndex(job?.status);
  const isBusy = Boolean(job && job.status !== "done" && job.status !== "error");

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">EV</div>
          <div>
            <div className="brand-name">EduVideo Studio</div>
            <div className="brand-sub">Du texte à la vidéo éducative</div>
          </div>
        </div>
        <div className="badge">Piloté par <strong>Claude</strong> · rendu <strong>HyperFrames</strong></div>
      </header>

      <section className="hero">
        <h1>Transformez un texte en <span>vidéo éducative</span>.</h1>
        <p>
          Claude structure votre contenu en scènes, la voix off est générée automatiquement,
          puis HyperFrames assemble une vidéo 1920×1080 prête à être partagée.
        </p>
      </section>

      <div className="grid">
        <form className="card" onSubmit={handleSubmit}>
          <h2>Votre contenu</h2>
          <p className="hint">Collez un cours, une explication ou un résumé. Plus le texte est clair, plus la vidéo est efficace.</p>

          <label className="field" htmlFor="source-text">Texte source</label>
          <textarea id="source-text" value={text} onChange={(event) => setText(event.target.value)} maxLength={8000} required />

          <div className="options">
            <label className="option" htmlFor="language">
              Langue
              <select id="language" value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
            <label className="option" htmlFor="voice">
              <input id="voice" type="checkbox" checked={voice} onChange={(event) => setVoice(event.target.checked)} />
              Voix off automatique
            </label>
          </div>

          <button className="primary" type="submit" disabled={submitting || isBusy || text.trim().length < 10}>
            {submitting || isBusy ? "Génération en cours…" : "Générer la vidéo"}
          </button>

          {error && <div className="error" role="alert">{error}</div>}
          {job?.status === "error" && <div className="error" role="alert">{job.error}</div>}
        </form>

        <section className="card">
          <h2>Résultat</h2>
          <p className="hint">La génération prend généralement une à deux minutes.</p>

          {!job && (
            <div className="empty">
              <div className="empty-icon">▶</div>
              <strong>Votre vidéo apparaîtra ici</strong>
              <span>Lancez la génération pour commencer.</span>
            </div>
          )}

          {job && (
            <div>
              <div className="progress-head">
                <strong>{isBusy ? "Génération en cours" : job.status === "done" ? "Vidéo terminée" : "Échec"}</strong>
                <span>{job.progress}%</span>
              </div>
              <div className="bar"><div className="bar-fill" style={{ width: `${job.progress}%` }} /></div>
              <div className="status-msg">{job.message}</div>

              <ul className="steps">
                {STEPS.map((step, index) => (
                  <li key={step.key} className={index < activeStep ? "done" : index === activeStep ? "active" : ""}>
                    <span className="dot" /> {step.label}
                    {index === 1 && !voice ? " (désactivée)" : ""}
                  </li>
                ))}
              </ul>

              {job.source === "demo" && (
                <p className="status-msg">Mode démo : définissez ANTHROPIC_API_KEY pour brancher votre compte Claude.</p>
              )}

              {job.storyboard && (
                <div className="storyboard">
                  <h3>{job.storyboard.title}</h3>
                  {job.storyboard.scenes.map((scene, index) => (
                    <div className="scene-line" key={`${scene.heading}-${index}`}>
                      <b>{String(index + 1).padStart(2, "0")}</b>
                      <span>{scene.heading}</span>
                    </div>
                  ))}
                </div>
              )}

              {job.status === "done" && job.videoPath && (
                <div>
                  <video controls preload="metadata" src={job.videoPath} />
                  <div className="actions">
                    <a className="download" href={job.videoPath} download={`video-${job.id.slice(0, 8)}.mp4`}>
                      Télécharger la vidéo
                    </a>
                    <a className="download" href={job.videoPath} target="_blank" rel="noreferrer">
                      Ouvrir dans un nouvel onglet
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <p className="footnote">
        Nécessite Node.js 20+, Chrome et FFmpeg. Les clés API se configurent dans <code>.env.local</code> (voir <code>.env.example</code>).
      </p>
    </main>
  );
}
