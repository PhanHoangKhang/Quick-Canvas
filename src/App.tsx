import { useState } from "react";
import "./App.css";
import logo from "./assets/logo.png";

interface AppProps {
  selectedText: string;
  onClose: () => void;
}

export default function App({ selectedText, onClose }: AppProps) {
  const [question, setQuestion] = useState("");

  return (
    <div className="quicktick w-[360px] max-h-[500px] overflow-y-auto bg-white text-[#12121f] rounded-xl border border-[#e5e5e5] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.16)]">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 overflow-hidden rounded-[9px]">
            <img
              src={logo}
              alt="Quicktick logo"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h1 className="text-[15px] font-bold leading-tight">
              Quick Canvas
            </h1>
            <p className="text-[11px] font-medium mt-[3px]">
              Understand. Instantly.
            </p>
          </div>
        </div>

        <button
          className="border-none bg-transparent text-[22px] cursor-pointer px-1"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      {/* Divider */}
      <div className="h-px bg-[#e8e8e8] my-[18px]" />

      {/* Selected text */}
      <section className="mb-[18px]">
        <span className="text-[10px] font-extrabold tracking-[1px] text-[#9d65fd]">
          SELECTED TEXT
        </span>

        <div className="mt-[9px] p-3 bg-[#f7f4fc] rounded-lg text-[13px] leading-[1.6]">
          {selectedText}
        </div>
      </section>

      {/* Explanation */}
      <section className="mb-[18px]">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-[14px] font-bold">
            Simple explanation
          </h2>
        </div>

        <p className="text-[13px] leading-[1.7] m-0">
          Your explanation will appear here.
        </p>
      </section>

      {/* Divider */}
      <div className="h-px bg-[#e8e8e8] my-[18px]" />

      {/* Input */}
      <form
        className="flex items-center gap-2 border border-[#e5e5e5] rounded-[9px] p-[6px] pl-3 focus-within:border-[#9d65fd] transition-colors"
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
          className="flex-1 min-w-0 border-none outline-none bg-transparent text-[12px] font-medium placeholder:text-[#12121f]/65"
        />

        <button
          type="submit"
          disabled={!question.trim()}
          aria-label="Send question"
          className="w-[30px] h-[30px] rounded-[7px] bg-[#9d65fd] text-white text-[18px] disabled:opacity-45 cursor-pointer disabled:cursor-default"
        >
          ↑
        </button>
      </form>

      {/* Footer */}
      <footer className="flex justify-between mt-[14px] text-[10px]">
        <span>Quicktick</span>
        <span>Canvas Learning Companion</span>
      </footer>
    </div>
  );
}