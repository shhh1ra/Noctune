import React from "react";
import ReactDOM from "react-dom/client";
import { initializeAppStorage } from "./bootstrap";
import { App } from "./ui/App";
import "./styles.css";
import "./themes.css";

async function bootstrap() {
  await initializeAppStorage().catch(() => undefined);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void bootstrap();
