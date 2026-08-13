// app/dashboard/error.tsx
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service like Sentry
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto p-6">
      <h1 className="text-2xl font-semibold">{error.message}</h1>
      <button
        onClick={() => reset()} // Attempts to re-render the segment
        className="mt-2 px-4 py-2 outline-1 outline-gray-300 hover:bg-gray-100 text-black rounded"
      >
        Retry
      </button>
    </main>
  );
}
