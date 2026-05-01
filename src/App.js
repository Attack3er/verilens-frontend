import React, { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import "./App.css";

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = process.env.REACT_APP_API_URL || "https://YOUR-HF-SPACE.hf.space";

// ── Helpers ───────────────────────────────────────────────────────────────────
function classifyFile(file) {
  if (!file) return null;
  const t = file.type;
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  if (t.startsWith("video/")) return "video";
  const ext = file.name.split(".").pop().toLowerCase();
  if (["mp4","mov","avi","mkv","webm"].includes(ext)) return "video";
  if (["mp3","wav","m4a","ogg","flac"].includes(ext)) return "audio";
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "image";
  return null;
}

function getVerdictMeta(verdict) {
  if (!verdict) return { color: "#94a3b8", icon: "◌", label: "—" };
  const v = verdict.toUpperCase();
  if (v.includes("DEEPFAKE")) return { color: "#ef4444", icon: "✕", label: "DEEPFAKE DETECTED" };
  if (v.includes("LIKELY MANIP")) return { color: "#f97316", icon: "⚠", label: "LIKELY MANIPULATED" };
  if (v.includes("UNCERTAIN")) return { color: "#eab308", icon: "?", label: "UNCERTAIN" };
  if (v.includes("AUTHENTIC")) return { color: "#22c55e", icon: "✓", label: "LIKELY AUTHENTIC" };
  if (v.includes("CANNOT")) return { color: "#64748b", icon: "⊘", label: "CANNOT PROCESS" };
  return { color: "#94a3b8", icon: "◌", label: verdict };
}

function fmt(val) {
  if (val == null) return "—";
  return (val * 100).toFixed(1) + "%";
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function ScanLine() {
  return <div className="scan-line" aria-hidden="true" />;
}

function Logo() {
  return (
    <div className="logo">
      <div className="logo-mark">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle cx="18" cy="18" r="16" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx="18" cy="18" r="9" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="18" cy="18" r="3" fill="#38bdf8" />
          <line x1="18" y1="2" x2="18" y2="8" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="18" y1="28" x2="18" y2="34" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="2" y1="18" x2="8" y2="18" stroke="#38bdf8" strokeWidth="1.5" />
          <line x1="28" y1="18" x2="34" y2="18" stroke="#38bdf8" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="logo-text">
        <span className="logo-veri">Veri</span><span className="logo-lens">Lens</span>
      </div>
    </div>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: "upload", label: "Upload File", icon: "↑" },
    { id: "url", label: "Paste Link", icon: "⌁" },
  ];
  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab-btn ${active === t.id ? "tab-active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          <span className="tab-icon">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function DropZone({ onFile }) {
  const onDrop = useCallback(files => {
    if (files.length > 0) onFile(files[0]);
  }, [onFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"],
      "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac"],
      "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
    },
  });

  return (
    <div {...getRootProps()} className={`dropzone ${isDragActive ? "dropzone-active" : ""}`}>
      <input {...getInputProps()} />
      <div className="dropzone-inner">
        <div className="dropzone-icon">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <rect x="2" y="2" width="40" height="40" rx="6" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 2"/>
            <path d="M22 28V16M22 16L17 21M22 16L27 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 32h18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          </svg>
        </div>
        <p className="dropzone-primary">
          {isDragActive ? "Drop to analyze" : "Drop your file here"}
        </p>
        <p className="dropzone-secondary">
          Images · Videos · Audio &nbsp;·&nbsp; or <span className="link-text">browse</span>
        </p>
        <p className="dropzone-limit">Max 100MB</p>
      </div>
    </div>
  );
}

function SelectedFile({ file, onClear }) {
  const kind = classifyFile(file);
  const icons = { image: "🖼", video: "🎬", audio: "🎧" };
  const size = file.size > 1024 * 1024
    ? (file.size / 1024 / 1024).toFixed(1) + " MB"
    : (file.size / 1024).toFixed(0) + " KB";
  return (
    <div className="selected-file">
      <span className="selected-file-icon">{icons[kind] || "📎"}</span>
      <div className="selected-file-info">
        <span className="selected-file-name">{file.name}</span>
        <span className="selected-file-meta">{kind?.toUpperCase()} · {size}</span>
      </div>
      <button className="selected-file-clear" onClick={onClear} title="Remove">✕</button>
    </div>
  );
}

function UrlInput({ value, onChange, onSubmit, loading }) {
  const platforms = [
    { label: "YouTube", ok: true },
    { label: "Twitter / X", ok: true },
    { label: "TikTok", ok: true },
    { label: "Reddit", ok: true },
    { label: "Instagram", ok: false },
    { label: "Facebook", ok: false },
  ];

  return (
    <div className="url-section">
      <div className="url-input-wrap">
        <span className="url-icon">⌁</span>
        <input
          className="url-input"
          type="url"
          placeholder="Paste video URL — YouTube, Twitter, TikTok, Reddit..."
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !loading && value && onSubmit()}
        />
        {value && (
          <button className="url-clear" onClick={() => onChange("")}>✕</button>
        )}
      </div>
      <div className="platform-chips">
        {platforms.map(p => (
          <span key={p.label} className={`platform-chip ${p.ok ? "chip-ok" : "chip-blocked"}`}>
            {p.ok ? "✓" : "✕"} {p.label}
          </span>
        ))}
      </div>
      <p className="url-note">
        Instagram &amp; Facebook block automated access.
        <a href="#how-to-upload" className="link-text"> Download &amp; upload instead.</a>
      </p>
    </div>
  );
}

function AnalyzeButton({ onClick, loading, disabled, label }) {
  return (
    <button
      className={`analyze-btn ${loading ? "btn-loading" : ""}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <span className="btn-spinner" />
          Analyzing…
        </>
      ) : (
        <>
          <span className="btn-icon">◈</span>
          {label || "Analyze"}
        </>
      )}
    </button>
  );
}

function ConfidenceBar({ label, value, color }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="conf-bar-wrap">
      <div className="conf-bar-header">
        <span className="conf-bar-label">{label}</span>
        <span className="conf-bar-value" style={{ color }}>{pct}%</span>
      </div>
      <div className="conf-bar-track">
        <div
          className="conf-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function FrameHeatmap({ scores }) {
  if (!scores || scores.length === 0) return null;
  return (
    <div className="heatmap-wrap">
      <p className="detail-label">Frame Analysis</p>
      <div className="heatmap-grid">
        {scores.map((s, i) => {
          const pct = Math.round(s * 100);
          const hue = Math.round((1 - s) * 120); // green→red
          return (
            <div
              key={i}
              className="heatmap-cell"
              style={{ background: `hsl(${hue}, 70%, 45%)`, opacity: 0.7 + s * 0.3 }}
              title={`Frame ${i + 1}: ${pct}% fake`}
            >
              <span className="heatmap-cell-label">{pct}</span>
            </div>
          );
        })}
      </div>
      <div className="heatmap-legend">
        <span>Authentic</span>
        <div className="legend-gradient" />
        <span>Deepfake</span>
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const meta = getVerdictMeta(result.verdict);
  const isUnsupported = result.verdict === "CANNOT PROCESS";

  return (
    <div className={`result-card result-${result.verdict_color || "gray"}`}>
      <ScanLine />

      {/* Verdict header */}
      <div className="result-header">
        <div className="verdict-icon" style={{ color: meta.color, borderColor: meta.color }}>
          {meta.icon}
        </div>
        <div className="verdict-text">
          <span className="verdict-label" style={{ color: meta.color }}>{meta.label}</span>
          <span className="verdict-type">{result.type?.toUpperCase()} · {result.filename || result.source || "uploaded file"}</span>
        </div>
      </div>

      {isUnsupported ? (
        <div className="unsupported-msg">
          <p>{result.message}</p>
          {result.how_to_download && (
            <div className="how-to">
              <strong>How to download &amp; upload:</strong>
              <p>{result.how_to_download}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Probability bars */}
          <div className="result-bars">
            <ConfidenceBar
              label="Deepfake / Synthetic Probability"
              value={result.fake_probability}
              color="#ef4444"
            />
            <ConfidenceBar
              label="Authentic Probability"
              value={result.real_probability}
              color="#22c55e"
            />
          </div>

          {/* Stats row */}
          <div className="result-stats">
            <div className="stat">
              <span className="stat-val">{fmt(result.confidence)}</span>
              <span className="stat-key">Confidence</span>
            </div>
            {result.video_analysis?.frames_analyzed && (
              <div className="stat">
                <span className="stat-val">{result.video_analysis.frames_analyzed}</span>
                <span className="stat-key">Frames</span>
              </div>
            )}
            {result.video_analysis?.duration_seconds && (
              <div className="stat">
                <span className="stat-val">{result.video_analysis.duration_seconds}s</span>
                <span className="stat-key">Duration</span>
              </div>
            )}
            {result.audio_analysis?.fake_probability != null && (
              <div className="stat">
                <span className="stat-val">{fmt(result.audio_analysis.fake_probability)}</span>
                <span className="stat-key">Audio Risk</span>
              </div>
            )}
          </div>

          {/* Frame heatmap */}
          {result.video_analysis?.frame_fake_scores && (
            <FrameHeatmap scores={result.video_analysis.frame_fake_scores} />
          )}

          {/* Disclaimer */}
          <p className="result-disclaimer">{result.disclaimer}</p>
        </>
      )}
    </div>
  );
}

function HowToUpload() {
  return (
    <div className="how-to-section" id="how-to-upload">
      <h3 className="section-title">Can't paste the link? Download &amp; upload</h3>
      <div className="how-to-grid">
        {[
          {
            platform: "Instagram",
            icon: "📸",
            steps: ["Open the post or Reel", "Tap ⋯ (three dots)", "Select 'Save' or use browser → right-click → Save video as"],
          },
          {
            platform: "Facebook",
            icon: "👤",
            steps: ["Open the video", "Tap ⋯ → 'Save video'", "Or: browser right-click → Save video as"],
          },
          {
            platform: "WhatsApp",
            icon: "💬",
            steps: ["Open the video message", "Long-press → Forward, or tap Download icon", "Find it in your Photos/Downloads"],
          },
        ].map(p => (
          <div key={p.platform} className="how-to-card">
            <span className="how-to-icon">{p.icon}</span>
            <strong className="how-to-platform">{p.platform}</strong>
            <ol className="how-to-steps">
              {p.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="about-section">
      <div className="about-grid">
        <div className="about-item">
          <span className="about-icon">🔬</span>
          <strong>How it works</strong>
          <p>VeriLens uses two open-source AI models: a Vision Transformer for face/image manipulation and a Wav2Vec2 model for AI-cloned voice detection.</p>
        </div>
        <div className="about-item">
          <span className="about-icon">🔒</span>
          <strong>Privacy</strong>
          <p>Files are processed in memory and immediately deleted. Nothing is stored, logged, or shared. No account required.</p>
        </div>
        <div className="about-item">
          <span className="about-icon">⚖️</span>
          <strong>Accuracy</strong>
          <p>Results are probabilistic, not conclusive. Open-source models achieve ~87–92% accuracy in controlled settings. Real-world accuracy varies.</p>
        </div>
        <div className="about-item">
          <span className="about-icon">💙</span>
          <strong>For the community</strong>
          <p>VeriLens is free, open-source, and built to help anyone who suspects they've received or been targeted by synthetic media.</p>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("upload");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  function reset() {
    setResult(null);
    setError(null);
  }

  function handleFile(f) {
    setFile(f);
    reset();
  }

  function handleTabChange(t) {
    setTab(t);
    setFile(null);
    setUrl("");
    reset();
  }

  async function analyze() {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      let endpoint, body;

      if (tab === "upload" && file) {
        const kind = classifyFile(file);
        if (!kind) throw new Error("Unsupported file type.");
        endpoint = `/analyze/${kind}`;
        body = new FormData();
        body.append("file", file);
      } else if (tab === "url" && url.trim()) {
        endpoint = "/analyze/url";
        body = new FormData();
        body.append("url", url.trim());
      } else {
        throw new Error("Nothing to analyze.");
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        body,
      });

      const data = await res.json();
      if (!res.ok && res.status !== 422) {
        throw new Error(data.detail || "Analysis failed.");
      }

      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canAnalyze = tab === "upload" ? !!file : !!url.trim();

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <Logo />
        <nav className="header-nav">
          <a href="#how-to-upload" className="nav-link">How to use</a>
          <a href="#about" className="nav-link">About</a>
          <a href="https://github.com/yourusername/verilens" className="nav-link" target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
      </header>

      <main className="main">
        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">Free · Open Source · No Account Required</div>
          <h1 className="hero-title">
            Is this video real?
            <br />
            <span className="hero-title-accent">Find out in seconds.</span>
          </h1>
          <p className="hero-subtitle">
            Upload a video, image, or audio clip — or paste a link — and VeriLens will analyze it for signs of AI manipulation, deepfake face swaps, or cloned voices.
          </p>
        </section>

        {/* Analyzer card */}
        <section className="analyzer-card">
          <TabBar active={tab} onChange={handleTabChange} />

          <div className="analyzer-body">
            {tab === "upload" ? (
              file ? (
                <SelectedFile file={file} onClear={() => { setFile(null); reset(); }} />
              ) : (
                <DropZone onFile={handleFile} />
              )
            ) : (
              <UrlInput
                value={url}
                onChange={v => { setUrl(v); reset(); }}
                onSubmit={analyze}
                loading={loading}
              />
            )}

            <AnalyzeButton
              onClick={analyze}
              loading={loading}
              disabled={!canAnalyze}
              label={tab === "url" ? "Fetch & Analyze" : "Analyze"}
            />

            {error && (
              <div className="error-msg">
                <span className="error-icon">⚠</span>
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Result */}
        {result && (
          <section className="result-section" ref={resultRef}>
            <ResultCard result={result} />
          </section>
        )}

        {/* How to upload */}
        <section className="section-wrap">
          <HowToUpload />
        </section>

        {/* About */}
        <section className="section-wrap" id="about">
          <AboutSection />
        </section>
      </main>

      <footer className="footer">
        <p>VeriLens is a free community tool. Results are probabilistic — not legal or forensic evidence.</p>
        <p>Built with ❤️ for anyone who needs it. <a href="https://github.com/yourusername/verilens" className="footer-link" target="_blank" rel="noreferrer">Open source on GitHub ↗</a></p>
      </footer>
    </div>
  );
}
