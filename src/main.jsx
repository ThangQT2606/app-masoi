import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// ── window.storage shim ──────────────────────────────────────────────
// App.jsx persists data via window.storage.get/set (a sandbox API that
// does not exist in a normal browser). Back it with localStorage so the
// "save group" / "last names" features work when running locally.
if (!window.storage) {
  window.storage = {
    async get(key) {
      const value = localStorage.getItem(key);
      return value === null ? null : { value };
    },
    async set(key, value) {
      localStorage.setItem(key, value);
    },
  };
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
