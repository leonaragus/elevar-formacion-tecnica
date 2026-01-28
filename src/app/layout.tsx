import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Supabase + Next.js 14",
  description: "Dashboard conectado a Supabase",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

