// app/vendor/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Store,
  MapPin,
  CreditCard,
  Building2,
  Mail,
  Phone,
  Globe,
  Save,
  Loader2,
  Info,
  AlertCircle,
} from "lucide-react";

interface ShopSettings {
  shopName: string;
  description: string;
  contactInfo: {
    phone: string;
    email: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    swiftCode?: string;
    upiId?: string;
  };
  commissionRate: number;
}

export default function VendorSettingsPage() {
  const t = useTranslations("VendorSettings");
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/vendor/settings");
      const json = await res.json();
      if (json.success) {
        // Ensure nesting exists
        const shop = json.shop;
        setSettings({
          shopName: shop.shopName || "",
          description: shop.description || "",
          contactInfo: shop.contactInfo || { phone: "", email: "" },
          address: shop.address || {
            street: "",
            city: "",
            state: "",
            pincode: "",
            country: "India",
          },
          bankDetails: shop.bankDetails || {
            accountHolderName: "",
            accountNumber: "",
            ifscCode: "",
            bankName: "",
            swiftCode: "",
            upiId: "",
          },
          commissionRate: shop.commissionRate || 10,
        });
      } else {
        toast.error(t("loadFailed"));
      }
    } catch (error) {
      toast.error(t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("updateSuccess"));
      } else {
        toast.error(json.message || t("updateFailed"));
      }
    } catch (error) {
      toast.error(t("updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleUpdate}>
        <Tabs defaultValue="profile" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Store className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">{t("tabShopProfile")}</span>
            </TabsTrigger>
            <TabsTrigger value="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">{t("tabContactAddress")}</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />{" "}
              <span className="hidden sm:inline">{t("tabBankDetails")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Shop Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("shopProfileTitle")}</CardTitle>
                <CardDescription>{t("shopProfileDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("shopName")}</label>
                  <Input
                    value={settings.shopName}
                    onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                    placeholder={t("shopNamePlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("description")}</label>
                  <Textarea
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    placeholder={t("descriptionPlaceholder")}
                    rows={4}
                  />
                </div>
                <div className="bg-muted/50 flex gap-3 rounded-lg p-4">
                  <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t.rich("commissionInfo", {
                      rate: settings.commissionRate,
                      strong: (chunks) => <strong>{chunks}</strong>,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address & Contact Tab */}
          <TabsContent value="address" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("contactInfoTitle")}</CardTitle>
                <CardDescription>{t("contactInfoDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("phoneNumber")}</label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute top-2.5 start-3 h-4 w-4" />
                    <Input
                      className="ps-9"
                      value={settings.contactInfo.phone}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contactInfo: { ...settings.contactInfo, phone: e.target.value },
                        })
                      }
                      placeholder={t("phoneNumberPlaceholder")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("emailAddress")}</label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-2.5 start-3 h-4 w-4" />
                    <Input
                      className="ps-9"
                      type="email"
                      value={settings.contactInfo.email}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contactInfo: { ...settings.contactInfo, email: e.target.value },
                        })
                      }
                      placeholder={t("emailAddressPlaceholder")}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("shopAddressTitle")}</CardTitle>
                <CardDescription>{t("shopAddressDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">{t("streetAddress")}</label>
                  <Input
                    value={settings.address.street}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        address: { ...settings.address, street: e.target.value },
                      })
                    }
                    placeholder={t("streetAddressPlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("city")}</label>
                  <Input
                    value={settings.address.city}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        address: { ...settings.address, city: e.target.value },
                      })
                    }
                    placeholder={t("cityPlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("state")}</label>
                  <Input
                    value={settings.address.state}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        address: { ...settings.address, state: e.target.value },
                      })
                    }
                    placeholder={t("statePlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("pincode")}</label>
                  <Input
                    value={settings.address.pincode}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        address: { ...settings.address, pincode: e.target.value },
                      })
                    }
                    placeholder={t("pincodePlaceholder")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("country")}</label>
                  <Input
                    value={settings.address.country}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        address: { ...settings.address, country: e.target.value },
                      })
                    }
                    placeholder={t("countryPlaceholder")}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Details Tab */}
          <TabsContent value="bank" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("bankAccountTitle")}</CardTitle>
                <CardDescription>{t("bankAccountDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("accountHolderName")}</label>
                    <Input
                      value={settings.bankDetails.accountHolderName}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          bankDetails: {
                            ...settings.bankDetails,
                            accountHolderName: e.target.value,
                          },
                        })
                      }
                      placeholder={t("accountHolderPlaceholder")}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("bankName")}</label>
                    <div className="relative">
                      <Building2 className="text-muted-foreground absolute top-2.5 start-3 h-4 w-4" />
                      <Input
                        className="ps-9"
                        value={settings.bankDetails.bankName}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            bankDetails: { ...settings.bankDetails, bankName: e.target.value },
                          })
                        }
                        placeholder={t("bankNamePlaceholder")}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("accountNumber")}</label>
                    <div className="relative">
                      <CreditCard className="text-muted-foreground absolute top-2.5 start-3 h-4 w-4" />
                      <Input
                        className="ps-9"
                        value={settings.bankDetails.accountNumber}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            bankDetails: { ...settings.bankDetails, accountNumber: e.target.value },
                          })
                        }
                        placeholder={t("accountNumberPlaceholder")}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("ifscCode")}</label>
                    <Input
                      value={settings.bankDetails.ifscCode}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          bankDetails: {
                            ...settings.bankDetails,
                            ifscCode: e.target.value.toUpperCase(),
                          },
                        })
                      }
                      placeholder={t("ifscPlaceholder")}
                      className="font-mono tracking-wider"
                      required
                    />
                    <p className="text-muted-foreground text-xs">{t("ifscHint")}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t("swiftCode")}{" "}
                      <span className="text-muted-foreground font-normal">
                        {t("swiftOptional")}
                      </span>
                    </label>
                    <Input
                      value={settings.bankDetails.swiftCode ?? ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          bankDetails: {
                            ...settings.bankDetails,
                            swiftCode: e.target.value.toUpperCase(),
                          },
                        })
                      }
                      placeholder={t("swiftPlaceholder")}
                      className="font-mono tracking-wider"
                    />
                    <p className="text-muted-foreground text-xs">{t("swiftHint")}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t("upiId")}</label>
                    <div className="relative">
                      <Globe className="text-muted-foreground absolute top-2.5 start-3 h-4 w-4" />
                      <Input
                        className="ps-9"
                        value={settings.bankDetails.upiId}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            bankDetails: { ...settings.bankDetails, upiId: e.target.value },
                          })
                        }
                        placeholder={t("upiPlaceholder")}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
                  <p className="text-xs text-blue-700">{t("bankSecurityNotice")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? (
              <>
                {" "}
                <Loader2 className="me-2 h-4 w-4 animate-spin" /> {t("saving")}{" "}
              </>
            ) : (
              <>
                {" "}
                <Save className="me-2 h-4 w-4" /> {t("saveAllChanges")}{" "}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
