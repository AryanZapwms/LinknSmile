"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeArabicIndicDigits } from "@/lib/normalize-digits";

interface Props {
  email: string;
  onSuccess: () => void;
}

export default function OtpForm({ email, onSuccess }: Props) {
  const t = useTranslations("OtpForm");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState(t("infoSentCode", { email }));
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
        setError(data.error || t("invalidCode"));
        return;
      }
      onSuccess();
    } catch (err) {
      setError(t("verificationFailed"));
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
        setError(data.error || t("couldntResend"));
      } else {
        setInfo(t("otpResentTo", { email }));
      }
    } catch (err) {
      setError(t("couldntResendRetry"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">{info}</p>
      {error && (
        <div className="text-destructive bg-destructive/10 rounded p-2 text-sm">{error}</div>
      )}
      <form onSubmit={verifyOtp} className="space-y-3">
        <Input
          value={otp}
          onChange={(e) =>
            setOtp(
              normalizeArabicIndicDigits(e.target.value)
                .replace(/[^0-9]/g, "")
                .slice(0, 6)
            )
          }
          placeholder={t("placeholder")}
          required
          maxLength={6}
          dir="ltr"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("verifying") : t("verify")}
          </Button>
          <Button type="button" variant="secondary" onClick={resend} disabled={isLoading}>
            {t("resend")}
          </Button>
        </div>
      </form>
    </div>
  );
}
