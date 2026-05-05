import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "We listen to the best podcasts so you don't have to. Free e-books and a bi-weekly newsletter.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
