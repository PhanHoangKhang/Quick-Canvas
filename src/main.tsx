import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import logo from "./assets/logo.png";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      selectedText="Test text"
      onClose={() => {}}
      logoSrc={logo}
    />
  </StrictMode>
);