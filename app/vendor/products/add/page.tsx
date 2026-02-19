'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Upload, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface Category {
  _id: string;
  name: string;
}

interface Company {
  _id: string;
  name: string;
}

export default function AddProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    discountPrice: '',
    image: '',
    images: [] as string[],
    category: '',
    company: '',
    stock: '',
    sku: '',
    ingredients: '',
    benefits: '',
    usage: '',
    suitableFor: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchCompanies();
  }, []);

  useEffect(() => {
    // Auto-generate slug from name
    if (formData.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.name]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCategories(data);
      } else {
        // Fallback for testing
        setCategories([
          { _id: '65cb76d8e48d41be9b46f43c', name: 'Organic & Natural' },
          { _id: '65cb76d8e48d41be9b46f43d', name: 'Handmade Crafts' },
          { _id: '65cb76d8e48d41be9b46f43e', name: 'Health & Wellness' },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([
        { _id: '65cb76d8e48d41be9b46f43c', name: 'Organic & Natural' },
        { _id: '65cb76d8e48d41be9b46f43d', name: 'Handmade Crafts' },
        { _id: '65cb76d8e48d41be9b46f43e', name: 'Health & Wellness' },
      ]);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/companies');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCompanies(data);
      } else {
        // Fallback for testing
        setCompanies([
          { _id: '65cb76d8e48d41be9b46f43a', name: 'Linknsmile Brand' },
          { _id: '65cb76d8e48d41be9b46f43b', name: 'Generic Brand' },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      setCompanies([
        { _id: '65cb76d8e48d41be9b46f43a', name: 'Linknsmile Brand' },
        { _id: '65cb76d8e48d41be9b46f43b', name: 'Generic Brand' },
      ]);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.urls && data.urls.length > 0) {
        // Set first image as main image, rest as gallery
        setFormData((prev) => ({
          ...prev,
          image: prev.image || data.urls[0],
          images: [...prev.images, ...data.urls],
        }));
        toast.success('Images uploaded successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("handleSubmit called");
    e.preventDefault();

    if (!formData.name || !formData.slug || !formData.price || !formData.company) {
      console.log("Form Validation Failed:", {
        name: formData.name,
        slug: formData.slug,
        price: formData.price,
        company: formData.company
      });
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : undefined,
        stock: formData.stock ? parseInt(formData.stock) : 0,
        ingredients: formData.ingredients ? formData.ingredients.split('\n').filter(Boolean) : [],
        benefits: formData.benefits ? formData.benefits.split('\n').filter(Boolean) : [],
        suitableFor: formData.suitableFor ? formData.suitableFor.split(',').map(s => s.trim()).filter(Boolean) : [],
        category: formData.category || undefined,
      };

      console.log("Submitting Payload:", payload);

      const res = await fetch('/api/vendor/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Product submitted for approval!');
        router.push('/vendor/products');
      } else {
        toast.error(data.message || 'Failed to create product');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
        <p className="text-muted-foreground">
          Create a new product listing for your shop
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Approval Required</AlertTitle>
        <AlertDescription>
          Products must be approved by admin before they appear on the storefront. You'll be notified once your product is reviewed.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential product details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Vitamin C Serum"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated from name"
                />
                <p className="text-xs text-muted-foreground">
                  URL-friendly version of the name
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Brand *</Label>
                <Select
                  value={formData.company}
                  onValueChange={(value) => setFormData({ ...formData, company: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company._id} value={company._id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="999.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discountPrice">Discount Price (₹)</Label>
                <Input
                  id="discountPrice"
                  type="number"
                  step="0.01"
                  value={formData.discountPrice}
                  onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                  placeholder="799.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="PROD-12345"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed product description..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
            <CardDescription>Upload product photos (first image will be the main image)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="images" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                  {uploading ? (
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 mb-2 text-primary animate-spin" />
                      <p className="font-medium text-primary">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 10MB
                      </p>
                    </>
                  )}
                </div>
                <Input
                  id="images"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </Label>
            </div>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Product ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {index === 0 && (
                      <Badge className="absolute bottom-2 left-2">Main Image</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
            <CardDescription>Optional product information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ingredients">Ingredients (one per line)</Label>
              <Textarea
                id="ingredients"
                rows={4}
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                placeholder="Water&#10;Glycerin&#10;Vitamin C"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits (one per line)</Label>
              <Textarea
                id="benefits"
                rows={4}
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="Brightens skin&#10;Reduces dark spots&#10;Anti-aging"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage">How to Use</Label>
              <Textarea
                id="usage"
                rows={3}
                value={formData.usage}
                onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                placeholder="Apply twice daily on clean skin..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suitableFor">Suitable For (comma-separated)</Label>
              <Input
                id="suitableFor"
                value={formData.suitableFor}
                onChange={(e) => setFormData({ ...formData, suitableFor: e.target.value })}
                placeholder="All skin types, Sensitive skin, Oily skin"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" size="lg" disabled={loading || uploading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}