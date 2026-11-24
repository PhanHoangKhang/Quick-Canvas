import { useState } from "react";

interface AppProps {
  selectedText: string;
  onClose: () => void;
  logoSrc: string;
}

export default function App({
  selectedText,
  onClose,
  logoSrc,
}: AppProps) {
  const [question, setQuestion] = useState("");

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

      <section className="qt-section">
        <span className="qt-label">SELECTED TEXT</span>

        <div className="qt-selected-text">{selectedText}</div>
      </section>

      <section className="qt-section">
        <div className="qt-section-title">
          <h2>Simple explanation</h2>
        </div>

        <p className="qt-description">Your explanation will appear here.</p>
      </section>

      <div className="qt-divider" />

      <form
        className="qt-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (!question.trim()) return;
          console.log(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this concept..."
        />

        <button
          type="submit"
          disabled={!question.trim()}
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
