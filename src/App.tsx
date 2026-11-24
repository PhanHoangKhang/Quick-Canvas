
import { useState } from "react";
import "./App.css";

export default function App() {
  const [question, setQuestion] = useState("");

  return (
    <div className="quicktick">
      <header className="qt-header">
        <div className="qt-brand">
          <div className="qt-logo">
            <span>✦</span>
          </div>

          <div>
            <h1>Quicktick</h1>
            <p>Understand. Instantly.</p>
          </div>
        </div>

        <button className="qt-icon-button" aria-label="Close">
          ×
        </button>
      </header>

      <div className="qt-divider" />

      <section className="qt-section">
        <span className="qt-label">SELECTED TEXT</span>

        <div className="qt-selected-text">
          “Consensus mechanisms ensure that all nodes in a
          distributed network agree on a single state.”
        </div>
      </section>

      <section className="qt-section">
        <div className="qt-section-title">
          <span className="qt-sparkle">✦</span>
          <h2>Simple explanation</h2>
        </div>

        <p className="qt-description">
          A consensus mechanism is a way for computers
          in a network to agree on which information is
          correct, even when they don't trust each other.
        </p>
      </section>

      <section className="qt-example">
        <span className="qt-example-title">
          <span>✦</span> Think of it like this
        </span>

        <p>
          Imagine 10 students keeping the same shared
          notebook. Before adding a new transaction,
          they need to agree that the entry is valid so
          everyone has the same version.
        </p>
      </section>

      <div className="qt-actions">
        <button className="qt-secondary-button">
          <span>▤</span> Simpler
        </button>

        <button className="qt-secondary-button">
          <span>♧</span> Another example
        </button>
      </div>

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
        <span>Quicktick</span>
        <span>Canvas Learning Companion</span>
      </footer>
    </div>
  );
}
