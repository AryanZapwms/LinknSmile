"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  email: string;
  onSuccess: () => void;
}

export default function OtpForm({ email, onSuccess }: Props) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(`We've sent a 6-digit code to ${email}`);
  const [isLoading, setIsLoading] = useState(false);

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }
      onSuccess();
    } catch (err) {
      setError("Verification failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function resend() {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't resend");
      } else {
        setInfo(`OTP resent to ${email}`);
      }
    } catch (err) {
      setError("Couldn't resend. Try later.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{info}</p>
      {error && <div className="p-2 text-sm text-destructive bg-destructive/10 rounded">{error}</div>}
      <form onSubmit={verifyOtp} className="space-y-3">
        <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 6-digit code" required maxLength={6} />
        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify"}
          </Button>
          <Button type="button" variant="secondary" onClick={resend} disabled={isLoading}>
            Resend
          </Button>
        </div>
      </form>
    </div>
  );
}
