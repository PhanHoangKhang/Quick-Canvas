import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import App from "./App";

const BUTTON_ID = "quicktick-explain-trigger";
const CONTAINER_ID = "quicktick-container";

console.log("QUICKTICK CONTENT SCRIPT LOADED");

let reactRoot: Root | null = null;

function removeButton() {
  document.getElementById(BUTTON_ID)?.remove();
}

function removeCard() {
  reactRoot?.unmount();
  reactRoot = null;

  document.getElementById(CONTAINER_ID)?.remove();
}

function createCard(text: string, rect: DOMRect) {
  console.log("Quicktick: createCard triggered");

  removeCard();

  const container = document.createElement("div");
  container.id = CONTAINER_ID;

  Object.assign(container.style, {
    position: "fixed",
    top: `${Math.max(12, Math.min(rect.bottom + 60, window.innerHeight - 420))}px`,
    left: `${Math.max(12, Math.min(rect.left, window.innerWidth - 372))}px`,
    zIndex: "2147483647",
  });

  document.body.appendChild(container);

  reactRoot = createRoot(container);

  reactRoot.render(
    <App selectedText={text} onClose={removeCard} />
  );
}

function createButton(rect: DOMRect, text: string) {
  console.log("createButton called:", text);

  removeButton();

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.textContent = "✦ Explain";
  button.type = "button";

  Object.assign(button.style, {
    position: "fixed",

    // Position below the selected text
    top: `${Math.max(
      8,
      Math.min(rect.bottom + 8, window.innerHeight - 48)
    )}px`,

    left: `${Math.max(
      8,
      Math.min(rect.left, window.innerWidth - 140)
    )}px`,

    zIndex: "2147483647",

    // Appearance
    padding: "8px 14px",
    border: "none",
    borderRadius: "10px",
    background: "#9D65FD",
    color: "#FFFFFF",

    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "Arial, sans-serif",

    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",

    // Force visibility
    display: "block",
    visibility: "visible",
    opacity: "1",

    // Reset inherited page styles
    margin: "0",
    outline: "none",
    textAlign: "center",
    lineHeight: "normal",
    appearance: "none",
    WebkitAppearance: "none",

    pointerEvents: "auto",
  });

  // Prevent Canvas from interfering with selection when clicking
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

    console.log("Quicktick button clicked!");

    createCard(text, rect);
  });

  document.body.appendChild(button);

  console.log("Button appended:", button);
  console.log(
    "Button in DOM:",
    document.getElementById(BUTTON_ID)
  );
}

function handleSelection() {
  console.log("mouseup detected");

  const selection = window.getSelection();

  console.log("selection:", selection?.toString());

  if (!selection || selection.isCollapsed) {
    removeButton();
    return;
  }

  const text = selection.toString().trim();

  if (!text) {
    removeButton();
    return;
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect();

  console.log("selection rect:", rect);

  createButton(rect, text);
}

document.addEventListener("mouseup", handleSelection);

document.addEventListener("keyup", (event) => {
  if (event.key === "Shift" || event.key.startsWith("Arrow")) {
    handleSelection();
  }
});

document.addEventListener("mousedown", (event) => {
  const target = event.target as HTMLElement;

  if (target.closest(`#${BUTTON_ID}`)) return;
  if (target.closest(`#${CONTAINER_ID}`)) return;

  removeButton();
});
