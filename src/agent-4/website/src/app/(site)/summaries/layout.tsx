import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick summaries",
  description: "Quick summaries of the best podcast episodes. Read the key ideas in 2 minutes.",
};

export default function SummariesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
