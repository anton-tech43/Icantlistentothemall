import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E-books",
  description: "Free e-books from the best podcast episodes. Download immediately, no email required.",
};

export default function EbooksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
