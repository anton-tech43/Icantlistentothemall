import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "We collect your email when you subscribe. That's it. No cookies, no tracking, no selling your data.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
