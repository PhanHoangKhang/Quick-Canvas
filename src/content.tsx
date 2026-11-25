import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import App from "./App";
import appStyles from "./App.css?inline";

const HOST_ID = "quicktick-host";
const MAX_SELECTED_CHARACTERS = 5000;

console.log("QUICKTICK CONTENT SCRIPT LOADED");

let host: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let reactRoot: Root | null = null;
let explainButton: HTMLButtonElement | null = null;
let cardOpen = false;

interface CanvasContext {
  courseName: string;
  pageTitle: string;
  documentTitle: string;
}

function getCanvasContext(): CanvasContext {
  const breadcrumb = document.querySelector<HTMLElement>("#breadcrumbs");

  const breadcrumbText = breadcrumb?.innerText
    .trim()
    .split("\n")
    .filter(Boolean);

  const courseCode = breadcrumbText?.[0] || "";
  const pageTitle = breadcrumbText?.[1] || "";

  const courseName = document.title.trim();

  const courseDisplayName = courseCode
    ? `${courseCode} — ${courseName}`
    : courseName;

  return {
    courseName: courseDisplayName,
    pageTitle,
    documentTitle: document.title.trim(),
  };
}

let currentCanvasContext: CanvasContext = getCanvasContext();

function refreshCanvasContext() {
  currentCanvasContext = getCanvasContext();
}

setInterval(refreshCanvasContext, 1000);

function initializeShadowDOM() {
  if (host) return;

  host = document.createElement("div");
  host.id = HOST_ID;

  Object.assign(host.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    pointerEvents: "none",
  });

  document.body.appendChild(host);

  shadowRoot = host.attachShadow({ mode: "open" });

  const styleElement = document.createElement("style");
  styleElement.textContent = appStyles;

  shadowRoot.appendChild(styleElement);
}

function removeButton() {
  explainButton?.remove();
  explainButton = null;
}

function removeCard() {
  reactRoot?.unmount();
  reactRoot = null;

  shadowRoot?.querySelector("#quicktick-card")?.remove();
}

function closeCard() {
  cardOpen = false;
  removeCard();
  window.getSelection()?.removeAllRanges();
}

function createCard(text: string, rect: DOMRect) {
  initializeShadowDOM();
  removeCard();
  cardOpen = true;

  const container = document.createElement("div");
  container.id = "quicktick-card";

  Object.assign(container.style, {
    position: "fixed",
    pointerEvents: "auto",
  });

  const cardWidth = 380;
  const estimatedCardHeight = 480;
  const gap = 12;

  let top = rect.top - estimatedCardHeight - gap;

  if (top < 12) {
    top = rect.bottom + gap;
  }

  top = Math.max(
    12,
    Math.min(top, window.innerHeight - estimatedCardHeight - 12),
  );

  const left = Math.max(
    12,
    Math.min(rect.left, window.innerWidth - cardWidth - 12),
  );

  Object.assign(container.style, {
    top: `${top}px`,
    left: `${left}px`,
  });

  shadowRoot!.appendChild(container);

  reactRoot = createRoot(container);

  reactRoot.render(
    <App
      selectedText={text}
      canvasContext={currentCanvasContext}
      onClose={closeCard}
      logoSrc={chrome.runtime.getURL("logo.png")}
    />,
  );

  removeButton();
}

function createButton(rect: DOMRect, text: string) {
  initializeShadowDOM();
  removeButton();

  const button = document.createElement("button");
  button.textContent = "✦ Explain";
  button.type = "button";

  Object.assign(button.style, {
    position: "fixed",

    top: `${Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 48))}px`,

    left: `${Math.max(8, Math.min(rect.left, window.innerWidth - 140))}px`,

    padding: "8px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#9D65FD",
    color: "#FFFFFF",

    fontSize: "14px",
    fontWeight: "600",
    fontFamily: '"Nunito", sans-serif',

    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",

    display: "block",
    visibility: "visible",
    opacity: "1",

    margin: "0",
    outline: "none",
    textAlign: "center",
    lineHeight: "normal",
    appearance: "none",
    WebkitAppearance: "none",

    pointerEvents: "auto",
  });

  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  button.addEventListener("mouseup", (event) => {
    event.stopPropagation();
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    createCard(text, rect);
  });

  shadowRoot!.appendChild(button);

  explainButton = button;
}

function handleSelection() {
  if (cardOpen) return;

  const selection = window.getSelection();

  if (!selection || selection.isCollapsed) {
    removeButton();
    return;
  }

  const text = selection.toString().trim();

  if (!text) {
    removeButton();
    return;
  }

  if (text.length > MAX_SELECTED_CHARACTERS) {
    removeButton();
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  createButton(rect, text);
}

document.addEventListener("mouseup", (event) => {
  if (host?.contains(event.target as Node)) return;
  handleSelection();
});

document.addEventListener("keyup", (event) => {
  if (event.key === "Shift" || event.key.startsWith("Arrow")) {
    handleSelection();
  }
});

document.addEventListener("mousedown", (event) => {
  if (host?.contains(event.target as Node)) return;

  removeButton();
});
