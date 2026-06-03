// components/checkout-form.tsx
"use client";

import type React from "react";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  MapPin,
  Phone,
  User,
  Building2,
  Hash,
  Globe,
  CreditCard,
  Banknote,
  ShieldCheck,
  Lock,
} from "lucide-react";

interface CheckoutFormProps {
  totalAmount: number;
  onSubmit: (address: any, paymentMethod: string) => Promise<void>;
  availablePaymentMethods: string[];
  isSubmitting?: boolean;
  initialData?: {
    name?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-500 uppercase">
        <Icon className="h-3.5 w-3.5 text-amber-500" />
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = (hasValue: boolean) =>
  `w-full h-11 px-4 text-sm border-2 rounded-xl bg-white text-stone-800 placeholder-stone-300 transition-all duration-150 focus:outline-none focus:border-amber-400 focus:bg-amber-50/30 ${
    hasValue ? "border-stone-300" : "border-stone-200"
  }`;

export function CheckoutForm({
  totalAmount,
  onSubmit,
  availablePaymentMethods,
  initialData,
  isSubmitting = false,
}: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    street: initialData?.street || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    zipCode: initialData?.zipCode || "",
    country: initialData?.country || "India",
  });
  const [paymentMethod, setPaymentMethod] = useState(availablePaymentMethods[0] || "razorpay");
  const [isLoading, setIsLoading] = useState(false);

  const busy = isLoading || isSubmitting;

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(formData, paymentMethod);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Shipping address ── */}
      <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
            <MapPin className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <h2 className="text-sm font-bold text-stone-900">Delivery Address</h2>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" icon={User}>
              <input
                name="name"
                value={formData.name}
                onChange={handle}
                placeholder="Aryan Gupta"
                required
                disabled={busy}
                className={inputCls(!!formData.name)}
              />
            </Field>
            <Field label="Phone Number" icon={Phone}>
              <input
                name="phone"
                value={formData.phone}
                onChange={handle}
                placeholder="+91 98765 43210"
                required
                disabled={busy}
                className={inputCls(!!formData.phone)}
              />
            </Field>
          </div>

          <Field label="Street Address" icon={MapPin}>
            <input
              name="street"
              value={formData.street}
              onChange={handle}
              placeholder="Flat / House no., Street, Area"
              required
              disabled={busy}
              className={inputCls(!!formData.street)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="City" icon={Building2}>
              <input
                name="city"
                value={formData.city}
                onChange={handle}
                placeholder="Mumbai"
                required
                disabled={busy}
                className={inputCls(!!formData.city)}
              />
            </Field>
            <Field label="State" icon={Building2}>
              <input
                name="state"
                value={formData.state}
                onChange={handle}
                placeholder="Maharashtra"
                required
                disabled={busy}
                className={inputCls(!!formData.state)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="PIN Code" icon={Hash}>
              <input
                name="zipCode"
                value={formData.zipCode}
                onChange={handle}
                placeholder="400001"
                required
                disabled={busy}
                className={inputCls(!!formData.zipCode)}
              />
            </Field>
            <Field label="Country" icon={Globe}>
              <input
                name="country"
                value={formData.country}
                disabled
                className="h-11 w-full cursor-not-allowed rounded-xl border-2 border-stone-100 bg-stone-50 px-4 text-sm text-stone-400"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* ── Payment method ── */}
      <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white">
        <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
            <CreditCard className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <h2 className="text-sm font-bold text-stone-900">Payment Method</h2>
        </div>

        <div className="p-5">
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
            {availablePaymentMethods.includes("razorpay") && (
              <label
                htmlFor="razorpay"
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all duration-150 ${
                  paymentMethod === "razorpay"
                    ? "border-amber-400 bg-amber-50/40"
                    : "border-stone-100 bg-white hover:border-stone-200"
                }`}
              >
                <RadioGroupItem value="razorpay" id="razorpay" className="shrink-0" />
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <CreditCard className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-900">Pay Online</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    Credit card, debit card, UPI, net banking
                  </p>
                </div>
                <div className="hidden items-center gap-1 sm:flex">
                  {["VISA", "UPI", "RuPay"].map((m) => (
                    <span
                      key={m}
                      className="rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold text-stone-400"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </label>
            )}

            {availablePaymentMethods.includes("cod") && (
              <label
                htmlFor="cod"
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-all duration-150 ${
                  paymentMethod === "cod"
                    ? "border-amber-400 bg-amber-50/40"
                    : "border-stone-100 bg-white hover:border-stone-200"
                }`}
              >
                <RadioGroupItem value="cod" id="cod" className="shrink-0" />
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-50">
                  <Banknote className="h-4.5 w-4.5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-stone-900">Cash on Delivery</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    Pay when your order arrives at your door
                  </p>
                </div>
              </label>
            )}
          </RadioGroup>
        </div>
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={busy}
        className={`flex h-13 w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-all duration-200 ${
          busy
            ? "cursor-not-allowed bg-stone-200 text-stone-400"
            : "bg-stone-900 text-white hover:bg-amber-500 hover:shadow-lg active:scale-[0.98]"
        }`}
      >
        {busy ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Processing…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Place Order · ₹{Math.round(totalAmount).toLocaleString()}
          </>
        )}
      </button>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
        <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
        Secured with 256-bit SSL encryption
      </div>
    </form>
  );
}
