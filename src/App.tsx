import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface CanvasContext {
  courseName: string;
  pageTitle: string;
  documentTitle: string;
}

interface AppProps {
  selectedText: string;
  canvasContext: CanvasContext;
  onClose: () => void;
  logoSrc: string;
}

const API_URL = "http://localhost:8787/api/explain";

export default function App({
  selectedText,
  canvasContext,
  onClose,
  logoSrc,
}: AppProps) {
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [displayedExplanation, setDisplayedExplanation] = useState("");

  async function explainConcept(userQuestion = "") {
    if (!selectedText.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectedText,
          question: userQuestion,
          courseContext: canvasContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Request failed with status ${response.status}`,
        );
      }

      setExplanation(data.explanation);
    } catch (err) {
      console.error("QuickTick API error:", err);

      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  // Automatically explain selected text when the card opens
  useEffect(() => {
    explainConcept();
  }, [selectedText]);

  useEffect(() => {
    if (!explanation) {
      setDisplayedExplanation("");
      return;
    }

    let currentIndex = 0;
    const chunkSize = 3;

    setDisplayedExplanation("");

    const interval = setInterval(() => {
      currentIndex = Math.min(currentIndex + chunkSize, explanation.length);

      setDisplayedExplanation(explanation.slice(0, currentIndex));

      if (currentIndex >= explanation.length) {
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [explanation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!question.trim() || isLoading) return;

    const currentQuestion = question.trim();
    setQuestion("");

    await explainConcept(currentQuestion);
  }

  return (
    <div className="quicktick">
      <header className="qt-header">
        <div className="qt-brand">
          <div className="qt-logo">
            <img src={logoSrc} alt="Quicktick logo" />
          </div>

          <div>
            <h1>Quick Canvas</h1>
            <p>Understand. Instantly.</p>
          </div>
        </div>

        <button
          className="qt-icon-button"
          aria-label="Close"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className="qt-divider" />

      <section className="qt-context">
        <div className="qt-context-item">
          <span className="qt-context-label">COURSE</span>
          <span className="qt-context-value">
            {canvasContext.courseName || "Unknown course"}
          </span>
        </div>

        <div className="qt-context-item">
          <span className="qt-context-label">CURRENT PAGE</span>
          <span className="qt-context-value">
            {canvasContext.pageTitle || "Unknown page"}
          </span>
        </div>
      </section>

      <div className="qt-divider" />

      <section className="qt-section">
        <span className="qt-label">SELECTED TEXT</span>

        <div className="qt-selected-text">{selectedText}</div>
      </section>

      <section className="qt-section">
        <div className="qt-section-title">
          <h2>Simple explanation</h2>
        </div>

        {isLoading && (
          <div className="qt-skeleton">
            <div className="qt-skeleton-line qt-skeleton-long" />
            <div className="qt-skeleton-line qt-skeleton-medium" />
            <div className="qt-skeleton-line qt-skeleton-long" />
            <div className="qt-skeleton-line qt-skeleton-short" />

            <div className="qt-skeleton-gap" />

            <div className="qt-skeleton-line qt-skeleton-medium" />
            <div className="qt-skeleton-line qt-skeleton-long" />
            <div className="qt-skeleton-line qt-skeleton-short" />
          </div>
        )}

        {error && <p className="qt-description">{error}</p>}

        {!isLoading && !error && displayedExplanation && (
          <div className="qt-explanation">
            <ReactMarkdown>{displayedExplanation}</ReactMarkdown>
          </div>
        )}
      </section>

      <div className="qt-divider" />

      <form className="qt-input" onSubmit={handleSubmit}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this concept..."
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={!question.trim() || isLoading}
          aria-label="Send question"
        >
          ↑
        </button>
      </form>

      <footer className="qt-footer">
        <span>Quick Canvas</span>
        <span>Canvas Learning Companion</span>
      </footer>
    </div>
  );
}
