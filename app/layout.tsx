import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal do Revendedor MIX10 PRO",
  description:
    "Programa de revendedores MIX10 PRO com kits, treinamento, pedidos e gestão da operação.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
