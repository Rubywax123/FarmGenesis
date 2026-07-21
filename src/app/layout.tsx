import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "FarmForecast",
  description: "Five-year financial forecasts for blueberry farm projects",
  applicationName: "FarmForecast",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FarmForecast",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f6b3a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
