import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prescription Explanation Tool",
  description: "Turn a prescription into a plain-language patient handout, reviewed by the doctor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased print:bg-white">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
