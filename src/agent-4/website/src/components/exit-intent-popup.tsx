"use client";

import { useState, useEffect } from "react";

export function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  useEffect(() => {
    if (document.cookie.includes("subscribed=1")) return;
    if (document.cookie.includes("exit_intent_shown=1")) return;
    if (window.innerWidth < 768) return;

    function handleMouseLeave(e: MouseEvent) {
      if (e.clientY <= 0) {
        setVisible(true);
        document.cookie = "exit_intent_shown=1;path=/";
        document.removeEventListener("mouseleave", handleMouseLeave);
      }
    }

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
      <div className="bg-white p-12 max-w-md w-full mx-4 relative text-center">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-4 right-4 text-secondary hover:text-foreground text-lg no-underline cursor-pointer"
          aria-label="Close"
        >
          &times;
        </button>

        {status === "success" ? (
          <p className="text-sm text-secondary">Check your inbox to confirm.</p>
        ) : (
          <>
            <p className="text-lg mb-6">Wait&mdash;</p>
            <p className="text-sm text-secondary mb-8">
              Readers get the best podcast insights every two weeks.
            </p>
            <form onSubmit={handleSubmit} className="flex items-center justify-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email"
                required
                className="bg-transparent border-b border-foreground/30 text-sm py-1 px-0 outline-none focus:border-foreground placeholder:text-secondary/50 w-48"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="text-sm underline cursor-pointer disabled:opacity-50"
              >
                &rarr;
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
