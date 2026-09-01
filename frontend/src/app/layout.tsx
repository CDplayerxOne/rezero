import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasValidClerkKey = Boolean(
  publishableKey && !publishableKey.includes("your_clerk"),
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RE:ZERO",
  description: "Next.js + FastAPI starter app",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const shell = (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ReactQueryProvider>
          {/* Header is a client component that hides itself on /workspace routes */}
          <Header />
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );

  if (!hasValidClerkKey) {
    return shell;
  }

  return (
    <ClerkProvider publishableKey={publishableKey!} afterSignOutUrl="/">
      {shell}
    </ClerkProvider>
  );
}
