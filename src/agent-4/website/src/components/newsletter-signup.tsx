"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
        document.cookie = "subscribed=1;path=/;max-age=31536000";
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p className="text-sm text-secondary">
        Check your inbox to confirm.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-sm">Get the bi-weekly newsletter</p>
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your email"
          required
          className="bg-transparent border-b border-foreground/30 text-sm py-1 px-0 outline-none focus:border-foreground placeholder:text-secondary/50 w-64"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="text-sm underline cursor-pointer disabled:opacity-50"
        >
          &rarr;
        </button>
      </div>
      <p className="text-xs text-secondary">
        Free. No spam. Unsubscribe anytime.
      </p>
      {status === "error" && (
        <p className="text-xs text-terracotta">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
