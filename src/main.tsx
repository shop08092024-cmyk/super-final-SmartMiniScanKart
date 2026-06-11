import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// Capture console errors and uncaught exceptions for loading troubleshooting
const capturedErrors: string[] = [];
const originalError = console.error;
console.error = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  if (msg.includes("Extension context invalidated") || msg.includes("content.js")) {
    originalError.apply(console, args);
    return;
  }
  capturedErrors.push(msg);
  originalError.apply(console, args);
};
window.addEventListener('error', (event) => {
  const msg = event.message || String(event.error || '');
  if (msg.includes("Extension context invalidated") || msg.includes("content.js")) return;
  capturedErrors.push(msg);
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = String(event.reason || '');
  if (reason.includes("Extension context invalidated") || reason.includes("content.js")) return;
  capturedErrors.push(`Unhandled Rejection: ${reason}`);
});
(window as any).__capturedErrors = capturedErrors;


const container = document.getElementById("root");
if (!container) {
  document.body.innerHTML =
    '<div style="display:flex;height:100vh;align-items:center;justify-content:center;font-family:system-ui;color:#666">Failed to initialize app - root element not found</div>';
} else {
  try {
    createRoot(container).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("Failed to render app:", error);
    container.innerHTML = `<div style="display:flex;height:100vh;align-items:center;justify-content:center;font-family:system-ui;color:#d32f2f;flex-direction:column;gap:1rem;padding:1rem;text-align:center"><h1 style="margin:0;font-size:1.5rem">Application Error</h1><p style="margin:0;color:#666">Check browser console for details</p></div>`;
  }
}