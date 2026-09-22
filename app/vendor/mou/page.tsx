// app/vendor/mou/page.tsx
"use client";

import { Suspense, useEffect, useState, Fragment, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileCheck2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface MouData {
  version: string;
  content: string;
  accepted: boolean;
  acceptedAt: string | null;
}

// Renders the fixed, server-generated MOU markdown (headings, bullet
// lists, a table, and **bold** spans only — see lib/mou-content.ts) inline,
// without pulling in a markdown dependency for one controlled document.
function renderInline(text: string, keyPrefix: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${idx}`}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={`${keyPrefix}-${idx}`}>{part}</Fragment>
    )
  );
}

function renderMouMarkdown(content: string): ReactNode[] {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key} className="text-xl font-bold">
          {renderInline(line.slice(2), `h1-${key++}`)}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key} className="mt-6 text-base font-bold first:mt-0">
          {renderInline(line.slice(3), `h2-${key++}`)}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      const listKey = key++;
      blocks.push(
        <ul key={listKey} className="list-disc space-y-1 ps-5 text-sm">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `li-${listKey}-${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.map((l) =>
        l
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim())
      );
      const [header, , ...body] = rows;
      blocks.push(
        <div key={key} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                {header.map((h, idx) => (
                  <th key={idx} className="py-1.5 text-start font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ridx) => (
                <tr key={ridx} className="border-b last:border-0">
                  {row.map((cell, cidx) => (
                    <td key={cidx} className="py-1.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      key++;
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("- ") &&
      !lines[i].startsWith("|")
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key} className="text-sm leading-relaxed">
        {renderInline(paraLines.join(" "), `p-${key++}`)}
      </p>
    );
  }

  return blocks;
}

function VendorMouContent() {
  const t = useTranslations("VendorMouPage");
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  // Only ever follow an internal, single-segment-rooted path — guards
  // against an open redirect via a crafted ?next= (e.g. "https://evil.com"
  // or the protocol-relative "//evil.com").
  const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  const [data, setData] = useState<MouData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vendor/mou");
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || t("loadFailed"));
        setData(json);
        setChecked(json.accepted);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = async () => {
    if (data?.accepted) {
      // Full navigation, not router.push — the vendor layout only fetches
      // /api/vendor/status once per session mount, so a soft client-side
      // route change would carry its stale mouAccepted state (false) right
      // back into the panel and re-trigger the block screen. Reloading
      // forces it to refetch and see the acceptance that was just recorded.
      window.location.href = next || "/vendor";
      return;
    }
    if (!checked) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/mou", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || t("acceptFailed"));
      window.location.href = next || "/vendor";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("acceptFailed"));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || t("loadFailed")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <Card className="overflow-hidden rounded-2xl border shadow-xl">
          <CardHeader className="space-y-2 border-b pb-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-xl font-bold">{t("pageTitle")}</CardTitle>
            </div>
            <CardDescription>{t("pageSubtitle")}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 pt-6">
            {data.accepted && data.acceptedAt && (
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <FileCheck2 className="h-4 w-4 shrink-0" />
                {t("acceptedOn", {
                  version: data.version,
                  date: new Date(data.acceptedAt).toLocaleDateString(),
                })}
              </div>
            )}

            <div className="max-h-[55vh] space-y-3 overflow-y-auto rounded-xl border bg-stone-50/50 p-5">
              {renderMouMarkdown(data.content)}
            </div>

            {!data.accepted && (
              <label className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-sm">
                <Checkbox
                  id="mou-agree"
                  checked={checked}
                  onCheckedChange={(value) => setChecked(value === true)}
                  className="mt-0.5"
                />
                <span>{t("checkboxLabel")}</span>
              </label>
            )}

            <Button
              onClick={handleContinue}
              disabled={submitting || (!data.accepted && !checked)}
              className="h-12 w-full rounded-xl bg-stone-900 font-bold text-white hover:bg-amber-500"
            >
              {submitting ? (
                <Loader2 className="me-2 h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="me-2 h-5 w-5" />
              )}
              {submitting
                ? t("submitting")
                : data.accepted
                  ? t("continueButton")
                  : t("agreeButton")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VendorMouFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="text-primary h-8 w-8 animate-spin" />
    </div>
  );
}

export default function VendorMouPage() {
  return (
    <Suspense fallback={<VendorMouFallback />}>
      <VendorMouContent />
    </Suspense>
  );
}
