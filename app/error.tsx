"use client";

/**
 * app/error.tsx
 *
 * Global error boundary for the Next.js App Router.
 * Place this file at app/error.tsx.
 *
 * This catches unhandled errors in the component tree and shows
 * a user-friendly page instead of a raw Next.js crash screen.
 */

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to your error tracking service here (e.g. Sentry)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Something went wrong</h1>
          <p className="text-sm text-gray-500">
            We hit an unexpected error. Our team has been notified.
            {error.digest && (
              <span className="mt-1 block text-xs text-gray-400">Error ID: {error.digest}</span>
            )}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="rounded-md bg-black px-4 py-2 text-sm text-white transition-colors hover:bg-gray-800"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm transition-colors hover:bg-gray-50"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
