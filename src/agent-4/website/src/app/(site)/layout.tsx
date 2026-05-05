import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { StickySignupBar } from "@/components/sticky-signup-bar";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
      <StickySignupBar />
    </>
  );
}
