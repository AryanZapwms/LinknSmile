"use client"

import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"
import type { SessionProviderProps } from "next-auth/react"

type AuthSessionProviderProps = SessionProviderProps & { session?: Session | null }

export function AuthSessionProvider({ children, session, ...props }: AuthSessionProviderProps) {
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={false}
      refetchInterval={0}
      refetchWhenOffline={false}
      {...props}
    >
      {children}
    </SessionProvider>
  )
}
