'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Building2,
  CreditCard,
  Globe,
  Loader2,
  Save,
  ShieldCheck,
  Info,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
} from 'lucide-react';

interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode?: string;
  upiId?: string;
}

const EMPTY_FORM: BankDetails = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  swiftCode: '',
  upiId: '',
};

/** Mask everything except the last 4 digits */
function maskAccount(num: string) {
  if (!num || num.length < 4) return num;
  return '•'.repeat(num.length - 4) + num.slice(-4);
}

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}
function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex items-center cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-2 text-xs bg-gray-900 text-white rounded-lg shadow-lg">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

export default function VendorBankDetailsPage() {
  const [form, setForm] = useState<BankDetails>(EMPTY_FORM);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  // Client-side validation errors
  const [errors, setErrors] = useState<Partial<Record<keyof BankDetails, string>>>({});

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const res = await fetch('/api/vendor/bank-details');
      const data = await res.json();
      if (data.success && data.bankDetails) {
        setForm({
          accountHolderName: data.bankDetails.accountHolderName || '',
          bankName: data.bankDetails.bankName || '',
          accountNumber: data.bankDetails.accountNumber || '',
          ifscCode: data.bankDetails.ifscCode || '',
          swiftCode: data.bankDetails.swiftCode || '',
          upiId: data.bankDetails.upiId || '',
        });
        setIsComplete(data.isComplete ?? false);
      }
    } catch {
      toast.error('Failed to load bank details');
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BankDetails, string>> = {};

    if (!form.accountHolderName.trim())
      newErrors.accountHolderName = 'Account holder name is required';

    if (!form.bankName.trim()) newErrors.bankName = 'Bank name is required';

    if (!form.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!/^\d{9,18}$/.test(form.accountNumber.trim())) {
      newErrors.accountNumber = 'Account number must be 9–18 digits';
    }

    const hasIfsc = form.ifscCode?.trim();
    const hasSwift = form.swiftCode?.trim();

    if (!hasIfsc && !hasSwift) {
      newErrors.ifscCode = 'Provide at least IFSC (domestic) or SWIFT (international)';
    }
    if (hasIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode.trim().toUpperCase())) {
      newErrors.ifscCode = 'Invalid format — e.g. HDFC0001234';
    }
    if (hasSwift && !/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(
      form.swiftCode!.trim().toUpperCase()
    )) {
      newErrors.swiftCode = 'Invalid SWIFT/BIC — e.g. HDFCINBBXXX';
    }

    if (form.upiId?.trim() && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(form.upiId.trim())) {
      newErrors.upiId = 'Invalid UPI ID — e.g. name@upi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/vendor/bank-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ifscCode: form.ifscCode?.trim().toUpperCase(),
          swiftCode: form.swiftCode?.trim().toUpperCase() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsComplete(true);
        toast.success('Bank details saved successfully!');
      } else {
        toast.error(data.message || 'Failed to save bank details');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof BankDetails, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-8">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bank Details</h1>
            <p className="text-sm text-muted-foreground">
              Required for receiving payouts from your sales.
            </p>
          </div>
          {isComplete ? (
            <Badge className="ml-auto bg-green-500 gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Payout Ready
            </Badge>
          ) : (
            <Badge variant="outline" className="ml-auto border-orange-400 text-orange-600 gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Incomplete
            </Badge>
          )}
        </div>
      </div>

      {/* ── Incomplete warning ────────────────────────────────────────────── */}
      {!isComplete && (
        <div className="flex gap-3 items-start p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-orange-800">Bank details required for payouts</p>
            <p className="text-xs text-orange-700 mt-0.5">
              Without verified bank details, payout requests cannot be processed. Please complete all
              required fields below.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} noValidate>
        {/* ── Account & Bank Info ───────────────────────────────────────── */}
        <Card className="mb-5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Account Information
            </CardTitle>
            <CardDescription>
              Enter your bank account details exactly as they appear in your bank records.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            {/* Account Holder Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium" htmlFor="acHolder">
                Account Holder Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="acHolder"
                value={form.accountHolderName}
                onChange={(e) => setField('accountHolderName', e.target.value)}
                placeholder="Full name as per bank records"
                className={errors.accountHolderName ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {errors.accountHolderName && (
                <p className="text-xs text-red-500">{errors.accountHolderName}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Must exactly match the name registered with your bank.
              </p>
            </div>

            {/* Bank Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="bankName">
                Bank Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="bankName"
                value={form.bankName}
                onChange={(e) => setField('bankName', e.target.value)}
                placeholder="e.g. HDFC Bank, SBI"
                className={errors.bankName ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {errors.bankName && <p className="text-xs text-red-500">{errors.bankName}</p>}
            </div>

            {/* Account Number */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="acNumber">
                Account Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  id="acNumber"
                  type={showAccount ? 'text' : 'password'}
                  value={form.accountNumber}
                  onChange={(e) => setField('accountNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="Digits only, 9–18 characters"
                  maxLength={18}
                  className={`pr-10 ${errors.accountNumber ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowAccount((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showAccount ? 'Hide account number' : 'Show account number'}
                >
                  {showAccount ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.accountNumber && (
                <p className="text-xs text-red-500">{errors.accountNumber}</p>
              )}
              {!showAccount && form.accountNumber && (
                <p className="text-xs text-muted-foreground font-mono">
                  Preview: {maskAccount(form.accountNumber)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Transfer Codes ────────────────────────────────────────────── */}
        <Card className="mb-5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Transfer Codes
            </CardTitle>
            <CardDescription>
              Provide IFSC for domestic (India) transfers and/or SWIFT/BIC for international payouts.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            {/* IFSC */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1" htmlFor="ifsc">
                IFSC Code
                <span className="text-red-500">*</span>
                <Tooltip content="Indian Financial System Code — 11-character code identifying your bank branch. Found on your cheque or passbook. Format: ABCD0123456 (4 letters, 0, 6 alphanumeric).">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                </Tooltip>
              </label>
              <Input
                id="ifsc"
                value={form.ifscCode}
                onChange={(e) => setField('ifscCode', e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                maxLength={11}
                className={`font-mono tracking-wider ${errors.ifscCode ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              />
              {errors.ifscCode && <p className="text-xs text-red-500">{errors.ifscCode}</p>}
              <p className="text-xs text-muted-foreground">Required for Indian bank accounts.</p>
            </div>

            {/* SWIFT */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1" htmlFor="swift">
                SWIFT / BIC Code
                <Tooltip content="Society for Worldwide Interbank Financial Telecommunication code — used for international wire transfers. 8 or 11 characters. Format: HDFCINBBXXX (bank code + country + location + branch).">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                </Tooltip>
                <span className="text-xs text-muted-foreground font-normal ml-1">(Optional)</span>
              </label>
              <Input
                id="swift"
                value={form.swiftCode}
                onChange={(e) => setField('swiftCode', e.target.value.toUpperCase())}
                placeholder="e.g. HDFCINBBXXX"
                maxLength={11}
                className={`font-mono tracking-wider ${errors.swiftCode ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
              />
              {errors.swiftCode && <p className="text-xs text-red-500">{errors.swiftCode}</p>}
              <p className="text-xs text-muted-foreground">Required for international payouts.</p>
            </div>
          </CardContent>
        </Card>

        {/* ── UPI ──────────────────────────────────────────────────────── */}
        <Card className="mb-5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Additional Payment Method
            </CardTitle>
            <CardDescription>Optional — speeds up instant payouts via UPI.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-w-sm">
              <label className="text-sm font-medium flex items-center gap-1" htmlFor="upiId">
                UPI ID
                <Tooltip content="Unified Payments Interface ID — e.g. yourname@okaxis, yourphone@paytm. Used for instant domestic payouts.">
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                </Tooltip>
                <span className="text-xs text-muted-foreground font-normal ml-1">(Optional)</span>
              </label>
              <Input
                id="upiId"
                value={form.upiId}
                onChange={(e) => setField('upiId', e.target.value)}
                placeholder="yourname@upi"
                className={errors.upiId ? 'border-red-400 focus-visible:ring-red-400' : ''}
              />
              {errors.upiId && <p className="text-xs text-red-500">{errors.upiId}</p>}
            </div>
          </CardContent>
        </Card>

        {/* ── Security notice ───────────────────────────────────────────── */}
        <div className="flex gap-3 items-start p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            <strong>Important:</strong> Ensure all details are absolutely correct. We are not
            responsible for payments sent to an incorrect account. Changes to bank details will apply
            to all future payout requests. Your data is securely stored and only accessible by you
            and our admin team.
          </p>
        </div>

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <Button type="submit" size="lg" disabled={saving} className="min-w-[160px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Bank Details
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
