import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|.*\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|json)$).*)",
    "/(api|trpc)(.*)",
  ],
};
