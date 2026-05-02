"use client";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("sid");
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("sid", id); }
  return id;
}

export function trackEvent(event: string, properties: Record<string, unknown> = {}) {
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, properties, session_id: getSessionId() }),
    }).catch(() => {});
  } catch {
    // silent
  }
}
