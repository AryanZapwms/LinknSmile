"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard } from "lucide-react"

interface PaymentSettings {
    _id?: string
    enableCOD: boolean
    enableRazorpay: boolean
    minCODAmount: number
    maxCODAmount: number
}

export default function SettingsPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [settings, setSettings] = useState<PaymentSettings>({
        enableCOD: true,
        enableRazorpay: true,
        minCODAmount: 0,
        maxCODAmount: 100000,
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState("")

    useEffect(() => {
        if (!session) {
            router.push("/auth/login")
            return
        }

        if (session.user?.role !== "admin") {
            router.push("/")
            return
        }

        fetchSettings()
    }, [session, router])

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/payment-settings")
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (error) {
            console.error("Error fetching settings:", error)
            setMessage("Error loading settings")
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: string, value: any) => {
        setSettings((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage("")

        try {
            const res = await fetch("/api/admin/payment-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            })

            if (res.ok) {
                setMessage("Settings saved successfully!")
                setTimeout(() => setMessage(""), 3000)
            } else {
                setMessage("Error saving settings")
            }
        } catch (error) {
            console.error("Error saving settings:", error)
            setMessage("Error saving settings")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-background">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <p className="text-muted-foreground">Loading settings...</p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-foreground mb-8">Payment Settings</h1>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Payment Methods Configuration
                        </CardTitle>
                        <CardDescription>Enable or disable payment methods for your customers</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {/* Payment Methods */}
                        <div className="space-y-4">
                            <div className="border border-border rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="razorpay"
                                        checked={settings.enableRazorpay}
                                        onCheckedChange={(checked) => handleChange("enableRazorpay", checked)}
                                    />
                                    <div className="flex-1">
                                        <Label htmlFor="razorpay" className="text-base font-semibold cursor-pointer">
                                            Razorpay
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Online payment gateway for credit/debit cards and UPI
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-border rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                    <Checkbox
                                        id="cod"
                                        checked={settings.enableCOD}
                                        onCheckedChange={(checked) => handleChange("enableCOD", checked)}
                                    />
                                    <div className="flex-1">
                                        <Label htmlFor="cod" className="text-base font-semibold cursor-pointer">
                                            Cash on Delivery (COD)
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Allow customers to pay when they receive their order
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COD Limits */}
                        {settings.enableCOD && (
                            <div className="space-y-4 border-t border-border pt-6">
                                <h3 className="font-semibold">COD Order Limits</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="minCOD">Minimum Order Amount (₹)</Label>
                                        <Input
                                            id="minCOD"
                                            type="number"
                                            value={settings.minCODAmount}
                                            onChange={(e) => handleChange("minCODAmount", Number(e.target.value))}
                                            min="0"
                                            className="mt-2"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Minimum order value to allow COD
                                        </p>
                                    </div>
                                    <div>
                                        <Label htmlFor="maxCOD">Maximum Order Amount (₹)</Label>
                                        <Input
                                            id="maxCOD"
                                            type="number"
                                            value={settings.maxCODAmount}
                                            onChange={(e) => handleChange("maxCODAmount", Number(e.target.value))}
                                            min="0"
                                            className="mt-2"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Maximum order value to allow COD
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Message */}
                        {message && (
                            <div
                                className={`p-3 rounded text-sm ${message.includes("successfully") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                    }`}
                            >
                                {message}
                            </div>
                        )}

                        {/* Save Button */}
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full md:w-auto"
                            size="lg"
                        >
                            {saving ? "Saving..." : "Save Settings"}
                        </Button>

                        {/* Validation Messages */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                            <p className="text-blue-900">
                                <strong>Note:</strong> At least one payment method must be enabled for customers to make purchases.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    )
}