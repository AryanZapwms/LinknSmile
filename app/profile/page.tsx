// app/profile/page.tsx
"use client";

import type React from "react";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, User, Phone, MapPin, Store, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  role?: string;
  pendingVendorApplication?: boolean;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("ProfilePage");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setProfile((prev) => ({
        ...prev,
        name: session.user?.name || "",
        email: session.user?.email || "",
      }));

      // Fetch full profile data from backend
      fetch("/api/users/profile")
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setProfile((prev) => ({
              ...prev,
              name: data.name || "",
              email: data.email || "",
              phone: data.phone || "",
              address: data.address || "",
              city: data.city || "",
              state: data.state || "",
              pincode: data.pincode || "",
              role: data.role || "",
              pendingVendorApplication: data.pendingVendorApplication || false,
            }));
          }
        })
        .catch((err) => console.error("Error fetching profile:", err));
    }
  }, [status, session]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      const updatedData = await res.json();
      setProfile(updatedData);
      setMessage(t("saveSuccess"));

      // Clear message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(t("saveError"));
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">{t("loadingProfile")}</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-foreground mb-2 text-3xl font-bold">{t("heading")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      {profile.role === "user" && profile.pendingVendorApplication && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Store className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">{t("vendorBannerTitle")}</p>
                <p className="text-xs text-amber-700">{t("vendorBannerBody")}</p>
              </div>
            </div>
            <Button
              size="sm"
              className="shrink-0 bg-amber-600 hover:bg-amber-700"
              onClick={() => router.push("/vendor-apply")}
            >
              {t("continueApplication")} <ArrowRight className="ms-1.5 h-3.5 w-3.5 rtl:rotate-180" />
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{t("personalInfoTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                <User className="me-2 inline h-4 w-4" />
                {t("fullNameLabel")}
              </label>
              <Input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder={t("fullNamePlaceholder")}
                className="bg-background border-border"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                <Mail className="me-2 inline h-4 w-4" />
                {t("emailLabel")}
              </label>
              <Input
                type="email"
                name="email"
                value={profile.email}
                disabled
                className="bg-muted border-border"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                <Phone className="me-2 inline h-4 w-4" />
                {t("phoneLabel")}
              </label>
              <Input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder={t("phonePlaceholder")}
                className="bg-background border-border"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-foreground mb-2 block text-sm font-medium">
                <MapPin className="me-2 inline h-4 w-4" />
                {t("addressLabel")}
              </label>
              <Input
                type="text"
                name="address"
                value={profile.address}
                onChange={handleChange}
                placeholder={t("addressPlaceholder")}
                className="bg-background border-border"
              />
            </div>

            {/* City, State, Pincode */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  {t("cityLabel")}
                </label>
                <Input
                  type="text"
                  name="city"
                  value={profile.city}
                  onChange={handleChange}
                  placeholder={t("cityPlaceholder")}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  {t("stateLabel")}
                </label>
                <Input
                  type="text"
                  name="state"
                  value={profile.state}
                  onChange={handleChange}
                  placeholder={t("statePlaceholder")}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-foreground mb-2 block text-sm font-medium">
                  {t("pincodeLabel")}
                </label>
                <Input
                  type="text"
                  name="pincode"
                  value={profile.pincode}
                  onChange={handleChange}
                  placeholder={t("pincodePlaceholder")}
                  className="bg-background border-border"
                />
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`rounded-lg p-4 text-sm font-medium transition-all ${
                  message.includes("✓")
                    ? "border border-green-200 bg-green-50 text-green-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t("saving") : t("saveChanges")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
