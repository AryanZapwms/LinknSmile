"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings2 } from "lucide-react";

interface PlatformSettings {
  _id?: string;
  supportEmail: string;
  supportPhone: string;
  brandTagline: string;
  taxRatePercent: number;
}

export default function PlatformSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [settings, setSettings] = useState<PlatformSettings>({
    supportEmail: "support@linknsmile.com",
    supportPhone: "+91 8355991099",
    brandTagline: "Net & Work Builds Up Net-Worth",
    taxRatePercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!session) {
      router.push("/auth/login");
      return;
    }
    if (session.user?.role !== "admin") {
      router.push("/");
      return;
    }
    fetchSettings();
  }, [session, router]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/platform-settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching platform settings:", error);
      setMessage("Error loading settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof PlatformSettings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/platform-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage("Settings saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || "Error saving settings");
      }
    } catch (error) {
      console.error("Error saving platform settings:", error);
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="bg-background min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-foreground mb-8 text-3xl font-bold">Platform Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              General Site Configuration
            </CardTitle>
            <CardDescription>
              Support contact info and site-wide copy — editable without a redeploy. Currency,
              locale, payment gateway, and the brand name itself stay deployment-level settings
              (env vars), not here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => handleChange("supportEmail", e.target.value)}
                  className="mt-2"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Shown in the footer, contact/about pages, and vendor-facing messages.
                </p>
              </div>
              <div>
                <Label htmlFor="supportPhone">Support Phone</Label>
                <Input
                  id="supportPhone"
                  type="text"
                  value={settings.supportPhone}
                  onChange={(e) => handleChange("supportPhone", e.target.value)}
                  className="mt-2"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  Include the country code, e.g. "+91 8355991099".
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="brandTagline">Brand Tagline</Label>
              <Textarea
                id="brandTagline"
                value={settings.brandTagline}
                onChange={(e) => handleChange("brandTagline", e.target.value)}
                className="mt-2"
                rows={2}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Short marketing line shown under the logo in the footer. Not the brand name itself.
              </p>
            </div>

            <div className="border-border border-t pt-6">
              <Label htmlFor="taxRatePercent">Tax Rate (%)</Label>
              <Input
                id="taxRatePercent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.taxRatePercent}
                onChange={(e) => handleChange("taxRatePercent", Number(e.target.value))}
                className="mt-2 w-40"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Placeholder for the upcoming tax/VAT engine — not applied to order totals yet.
                Storing it here so that work has a place to read from.
              </p>
            </div>

            {message && (
              <div
                className={`rounded p-3 text-sm ${
                  message.includes("successfully")
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {message}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto" size="lg">
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
