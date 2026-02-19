'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
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
  AlertCircle
} from 'lucide-react';

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
    upiId?: string;
  };
  commissionRate: number;
}

export default function VendorSettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/vendor/settings');
      const json = await res.json();
      if (json.success) {
        // Ensure nesting exists
        const shop = json.shop;
        setSettings({
          shopName: shop.shopName || '',
          description: shop.description || '',
          contactInfo: shop.contactInfo || { phone: '', email: '' },
          address: shop.address || { street: '', city: '', state: '', pincode: '', country: 'India' },
          bankDetails: shop.bankDetails || { accountHolderName: '', accountNumber: '', ifscCode: '', bankName: '', upiId: '' },
          commissionRate: shop.commissionRate || 10
        });
      } else {
        toast.error('Failed to load settings');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/vendor/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Settings updated successfully!');
      } else {
        toast.error(json.message || 'Failed to update settings');
      }
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Shop Settings</h1>
        <p className="text-muted-foreground">Manage your shop profile, contact details, and bank information.</p>
      </div>

      <form onSubmit={handleUpdate}>
        <Tabs defaultValue="profile" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Store className="h-4 w-4" /> <span className="hidden sm:inline">Shop Profile</span>
            </TabsTrigger>
            <TabsTrigger value="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> <span className="hidden sm:inline">Contact & Address</span>
            </TabsTrigger>
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> <span className="hidden sm:inline">Bank Details</span>
            </TabsTrigger>
          </TabsList>

          {/* Shop Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Shop Profile</CardTitle>
                <CardDescription>Update your shop's basic identity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Shop Name</label>
                  <Input 
                    value={settings.shopName} 
                    onChange={(e) => setSettings({...settings, shopName: e.target.value})}
                    placeholder="Enter shop name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea 
                    value={settings.description} 
                    onChange={(e) => setSettings({...settings, description: e.target.value})}
                    placeholder="Tell customers about your shop..."
                    rows={4}
                  />
                </div>
                <div className="p-4 bg-muted/50 rounded-lg flex gap-3">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your current platform commission rate is <strong>{settings.commissionRate}%</strong>. 
                    This rate is applied to each order. Contact admin to request a rate change.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address & Contact Tab */}
          <TabsContent value="address" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>How customers and admin can reach you.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-9"
                      value={settings.contactInfo.phone} 
                      onChange={(e) => setSettings({...settings, contactInfo: {...settings.contactInfo, phone: e.target.value}})}
                      placeholder="9876543210"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      className="pl-9"
                      type="email"
                      value={settings.contactInfo.email} 
                      onChange={(e) => setSettings({...settings, contactInfo: {...settings.contactInfo, email: e.target.value}})}
                      placeholder="vendor@example.com"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shop Address</CardTitle>
                <CardDescription>Primary business location.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Street Address</label>
                  <Input 
                    value={settings.address.street} 
                    onChange={(e) => setSettings({...settings, address: {...settings.address, street: e.target.value}})}
                    placeholder="123 Business Lane"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Input 
                    value={settings.address.city} 
                    onChange={(e) => setSettings({...settings, address: {...settings.address, city: e.target.value}})}
                    placeholder="Mumbai"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Input 
                    value={settings.address.state} 
                    onChange={(e) => setSettings({...settings, address: {...settings.address, state: e.target.value}})}
                    placeholder="Maharashtra"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pincode</label>
                  <Input 
                    value={settings.address.pincode} 
                    onChange={(e) => setSettings({...settings, address: {...settings.address, pincode: e.target.value}})}
                    placeholder="400001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>
                  <Input 
                    value={settings.address.country} 
                    onChange={(e) => setSettings({...settings, address: {...settings.address, country: e.target.value}})}
                    placeholder="India"
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
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>Essential for receiving your earnings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account Holder Name</label>
                    <Input 
                      value={settings.bankDetails.accountHolderName} 
                      onChange={(e) => setSettings({...settings, bankDetails: {...settings.bankDetails, accountHolderName: e.target.value}})}
                      placeholder="As per bank records"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bank Name</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        className="pl-9"
                        value={settings.bankDetails.bankName} 
                        onChange={(e) => setSettings({...settings, bankDetails: {...settings.bankDetails, bankName: e.target.value}})}
                        placeholder="e.g. HDFC Bank"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account Number</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        className="pl-9"
                        value={settings.bankDetails.accountNumber} 
                        onChange={(e) => setSettings({...settings, bankDetails: {...settings.bankDetails, accountNumber: e.target.value}})}
                        placeholder="0000000000"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">IFSC Code</label>
                    <Input 
                      value={settings.bankDetails.ifscCode} 
                      onChange={(e) => setSettings({...settings, bankDetails: {...settings.bankDetails, ifscCode: e.target.value.toUpperCase()}})}
                      placeholder="ABCD0123456"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">UPI ID (Optional)</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        className="pl-9"
                        value={settings.bankDetails.upiId} 
                        onChange={(e) => setSettings({...settings, bankDetails: {...settings.bankDetails, upiId: e.target.value}})}
                        placeholder="user@upi"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-700">
                    Ensure these details are absolutely correct. We won't be responsible for payments sent to the wrong account provided here. 
                    Changes here will reflect in all future payout requests.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? (
              <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving... </>
            ) : (
              <> <Save className="mr-2 h-4 w-4" /> Save All Changes </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
