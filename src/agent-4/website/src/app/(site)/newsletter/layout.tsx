import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "The best podcast insights every two weeks. One email with the top insight, a surprising stat, and something you can do today.",
};

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
