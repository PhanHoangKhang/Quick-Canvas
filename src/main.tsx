import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import logo from "./assets/logo.png";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      selectedText="Test text"
      canvasContext={{
        courseName: "ISYS2099 | ISYS3434",
        pageTitle: "W5 - Learning Materials: Database Applications",
        documentTitle: "W5 - Learning Materials: Database Applications",
      }}
      onClose={() => {}}
      logoSrc={logo}
    />
  </StrictMode>
);