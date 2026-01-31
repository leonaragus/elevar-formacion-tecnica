import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata = {
  title: "Instituto de Formación Técnica - Plataforma Educativa",
  description: "Plataforma educativa profesional para tu desarrollo académico",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-gray-950">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
