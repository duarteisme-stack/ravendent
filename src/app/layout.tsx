import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FallingFeathers from "@/components/FallingFeathers";
import { getClinicData } from "@/lib/clinic";

export const metadata: Metadata = {
  title: { default: "RavenDent | Your Smile. Our Precision.", template: "%s | RavenDent" },
  description: "RavenDent is a dental clinic offering comfortable, reliable care. View available appointments and book online.",
};

export const viewport: Viewport = { themeColor: "#0B0B0F", width: "device-width", initialScale: 1, viewportFit: "cover" };

export const revalidate = 60;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getClinicData();
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Instrument+Serif:ital@0;1&display=swap"
        />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-snow focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to main content
        </a>
        <FallingFeathers />
        <Navbar />
        <main id="main">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
