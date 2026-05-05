"use client";

import { useState, useEffect } from "react";

export function StickySignupBar() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  useEffect(() => {
    if (document.cookie.includes("subscribed=1")) return;

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("submitting");
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setStatus("success");
      document.cookie = "subscribed=1;path=/;max-age=31536000";
      setTimeout(() => setVisible(false), 2000);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 md:bottom-auto md:top-0 left-0 right-0 bg-white border-t md:border-t-0 md:border-b border-foreground/10 py-3 px-6 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-3 text-sm">
        {status === "success" ? (
          <span className="text-secondary">Check your inbox to confirm.</span>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <span>Get the bi-weekly newsletter:</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your email"
              required
              className="bg-transparent border-b border-foreground/30 text-sm py-0.5 px-0 outline-none focus:border-foreground placeholder:text-secondary/50 w-48"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="underline cursor-pointer disabled:opacity-50"
            >
              &rarr;
            </button>
          </form>
        )}
        <button
          onClick={() => setVisible(false)}
          className="ml-4 text-secondary hover:text-foreground text-xs no-underline cursor-pointer"
          aria-label="Close"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
