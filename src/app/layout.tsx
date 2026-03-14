import type { Metadata, Viewport } from "next";
import Script from "next/script";
import ThemeProvider from "@/components/Provider/Theme";
import I18Provider from "@/components/Provider/I18n";
import Debugger from "@/components/Internal/Debugger";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const HEAD_SCRIPTS = process.env.HEAD_SCRIPTS as string;

// OEM Branding Configuration from Environment Variables
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "AI论文撰写智能体";
const APP_DEFAULT_TITLE = process.env.NEXT_PUBLIC_APP_TITLE || APP_NAME;
const APP_TITLE_TEMPLATE = `%s - ${APP_NAME}`;
const APP_DESCRIPTION = process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
  "AI-powered academic thesis writing assistant with deep research capabilities";
const APP_LOGO = process.env.NEXT_PUBLIC_APP_LOGO || "logo.svg";
const APP_THEME_COLOR = process.env.NEXT_PUBLIC_APP_THEME_COLOR || "#FFFFFF";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  icons: {
    icon: {
      type: "image/svg+xml",
      url: `./${APP_LOGO}`,
    },
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  minimumScale: 1.0,
  maximumScale: 1.0,
  viewportFit: "cover",
  userScalable: false,
  themeColor: APP_THEME_COLOR,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="auto" suppressHydrationWarning>
      <head>
        {HEAD_SCRIPTS ? <Script id="headscript">{HEAD_SCRIPTS}</Script> : null}
        <Debugger />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <I18Provider>{children}</I18Provider>
        </ThemeProvider>
        <Toaster richColors toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}
