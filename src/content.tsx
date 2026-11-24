import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import App from "./App";

const BUTTON_ID = "quicktick-explain-trigger";
const CONTAINER_ID = "quicktick-container";

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
  removeCard();

  const container = document.createElement("div");
  container.id = CONTAINER_ID;

  Object.assign(container.style, {
    position: "fixed",
    top: `${Math.min(
      rect.bottom + 60,
      window.innerHeight - 450
    )}px`,
    left: `${Math.min(
      rect.left,
      window.innerWidth - 380
    )}px`,
    zIndex: "2147483647",
  });

  document.body.appendChild(container);

  reactRoot = createRoot(container);

  reactRoot.render(
    <App
      selectedText={text}
      onClose={removeCard}
    />
  );
}

function createButton(rect: DOMRect, text: string) {
  removeButton();

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.textContent = "✦ Explain";

  Object.assign(button.style, {
    position: "fixed",
    top: `${rect.bottom + 8}px`,
    left: `${Math.min(
      rect.left,
      window.innerWidth - 120
    )}px`,
    zIndex: "2147483647",
    padding: "8px 12px",
    border: "none",
    borderRadius: "10px",
    background: "#9D65FD",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "Arial, sans-serif",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  });

  button.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  button.addEventListener("click", () => {
    createCard(text, rect);
  });

  document.body.appendChild(button);
}

function handleSelection() {
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

  const rect = selection.getRangeAt(0).getBoundingClientRect();

  if (!rect.width || !rect.height) {
    removeButton();
    return;
  }

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
