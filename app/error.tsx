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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Something went wrong
          </h1>
          <p className="text-gray-500 text-sm">
            We hit an unexpected error. Our team has been notified.
            {error.digest && (
              <span className="block mt-1 text-xs text-gray-400">
                Error ID: {error.digest}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
