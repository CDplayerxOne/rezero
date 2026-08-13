"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasValidClerkKey = Boolean(
  publishableKey && !publishableKey.includes("your_clerk"),
);

export default function Header() {
  const pathname = usePathname() ?? "";

  // Hide header on workspace pages
  if (pathname.startsWith("/workspace")) return null;

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          RE:ZERO
        </Link>
        <div>
          {hasValidClerkKey ? (
            <>
              <SignedOut>
                <SignInButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              Set Clerk env vars to enable auth
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
