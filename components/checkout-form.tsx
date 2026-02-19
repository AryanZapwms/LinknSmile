"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface CheckoutFormProps {
  totalAmount: number
  onSubmit: (address: any, paymentMethod: string) => Promise<void>
  availablePaymentMethods: string[]
  initialData?: {
    name?: string
    phone?: string
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
}

export function CheckoutForm({ totalAmount, onSubmit, availablePaymentMethods, initialData }: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    street: initialData?.street || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zipCode: initialData?.zipCode || "",
    country: initialData?.country || "India",
  })
  const [paymentMethod, setPaymentMethod] = useState(availablePaymentMethods[0] || "razorpay")
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await onSubmit(formData, paymentMethod)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping Address</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required />
            </div>
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+91 9876543210" required />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Street Address</label>
            <Input name="street" value={formData.street} onChange={handleChange} placeholder="123 Main St" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">City</label>
              <Input name="city" value={formData.city} onChange={handleChange} placeholder="City" required />
            </div>
            <div>
              <label className="text-sm font-medium">State</label>
              <Input name="state" value={formData.state} onChange={handleChange} placeholder="State" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">ZIP Code</label>
              <Input name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="ZIP Code" required />
            </div>
            <div>
              <label className="text-sm font-medium">Country</label>
              <Input name="country" value={formData.country} disabled className="bg-muted" />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="border-t border-border pt-4">
            <Label className="text-sm font-medium block mb-3">Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="space-y-3">
                {availablePaymentMethods.includes("razorpay") && (
                  <div className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="razorpay" id="razorpay" />
                    <Label htmlFor="razorpay" className="cursor-pointer flex-1">
                      <span className="font-medium">Razorpay</span>
                      <p className="text-xs text-muted-foreground">Pay securely using credit card, debit card, or UPI</p>
                    </Label>
                  </div>
                )}
                {availablePaymentMethods.includes("cod") && (
                  <div className="flex items-center space-x-2 border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="cursor-pointer flex-1">
                      <span className="font-medium">Cash on Delivery (COD)</span>
                      <p className="text-xs text-muted-foreground">Pay when you receive your order</p>
                    </Label>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading} size="lg">
            {isLoading ? "Processing..." : `Proceed - ₹${totalAmount}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
