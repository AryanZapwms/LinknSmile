"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, X, Upload, Loader2, Pencil } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface Company {
  _id: string
  name: string
}

interface Category {
  _id: string
  name: string
  slug: string
  parent?: { name: string; slug: string; _id?: string }
  subCategories?: Category[]
  company?: string
}

interface Result {
  image: string
  title: string
  text: string
}

interface Size {
  size: string
  unit: "ml" | "l" | "g" | "kg"
  quantity: number
  price: number
  discountPrice?: number
  stock: number
  sku?: string
}

const createEmptySize = (): Size => ({
  size: "",
  unit: "ml",
  quantity: 0,
  price: 0,
  discountPrice: 0,
  stock: 0,
  sku: "",
})

interface Product {
  _id: string
  name: string
  slug: string
  description: string
  price: number
  discountPrice?: number
  image: string
  images?: string[]
  category: string
  company: string
  stock: number
  sku: string
  ingredients: string[]
  benefits: string[]
  usage: string
  suitableFor?: string[]
  results?: Result[]
  sizes?: Size[]
  isActive: boolean
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const productId = params.id as string
  const [companies, setCompanies] = useState<Company[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingResult, setUploadingResult] = useState(false)
  const [message, setMessage] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [formData, setFormData] = useState<Product & { mainCategory?: string }>({
    _id: "",
    name: "",
    slug: "",
    description: "",
    price: 0,
    discountPrice: 0,
    image: "",
    images: [],
    category: "",
    mainCategory: "",
    company: "",
    stock: 0,
    sku: "",
    ingredients: [],
    benefits: [],
    usage: "",
    suitableFor: [],
    results: [],
    isActive: true,
  })
  const [results, setResults] = useState<Array<{ image: string; title: string; text: string }>>([])
  const [resultInput, setResultInput] = useState({ image: "", title: "", text: "" })
  const [resultImageUrl, setResultImageUrl] = useState("")
  const [sizes, setSizes] = useState<Size[]>([])
  const [editingSizeIndex, setEditingSizeIndex] = useState<number | null>(null)
  const [sizeInput, setSizeInput] = useState<Size>(createEmptySize())

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }

    fetchData()
  }, [session, router])

  const fetchData = async () => {
    try {
      const [productRes, companiesRes] = await Promise.all([
        fetch(`/api/products/${productId}`),
        fetch("/api/companies"),
      ])

      const productData = await productRes.json()
      const companiesData = await companiesRes.json()

      // Extract company and category IDs if they are objects
      const companyId = typeof productData.company === 'object' ? productData.company._id : productData.company
      const categoryId = typeof productData.category === 'object' ? productData.category._id : productData.category

      // Fetch categories for the product's company
      const categoriesRes = await fetch(`/api/categories?company=${companyId}`)
      const categoriesData = await categoriesRes.json()

      // Prepare form data with extracted IDs
      const formDataWithIds = {
        ...productData,
        company: companyId,
        category: categoryId,
      }

      setFormData(formDataWithIds)
      setImageUrls(productData.images || (productData.image ? [productData.image] : []))
      setResults(productData.results || [])
      setSizes(productData.sizes || [])
      setCompanies(companiesData)
      setCategories(categoriesData)

      // Set mainCategory and category based on product's category
      // Search through all categories including nested subCategories
      let foundCategory: Category | null = null
      let mainCategoryId = ''

      // First check main categories
      const mainCat = categoriesData.find((c: Category) => c._id === categoryId)
      if (mainCat) {
        foundCategory = mainCat
        mainCategoryId = mainCat._id
        setFormData(prev => ({ ...prev, mainCategory: mainCategoryId, category: '' }))
      } else {
        // Check subCategories within main categories
        for (const main of categoriesData) {
          const subCat = main.subCategories?.find((sub: Category) => sub._id === categoryId)
          if (subCat) {
            foundCategory = subCat
            mainCategoryId = main._id
            setFormData(prev => ({ ...prev, mainCategory: mainCategoryId, category: subCat._id }))
            break
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setMessage("Error loading product data")
    } finally {
      setLoading(false)
    }
  }

  const fetchCategoriesForCompany = async (companyId: string) => {
    try {
      // Fetch categories for the selected company
      const categoriesRes = await fetch(`/api/categories?company=${companyId}`)
      const categoriesData = categoriesRes.ok ? await categoriesRes.json() : []
      setCategories(categoriesData)
      // Reset category selections when company changes
      setFormData((prev) => ({
        ...prev,
        mainCategory: "",
        category: "",
      }))
    } catch (error) {
      console.error("Error fetching categories:", error)
      setCategories([])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    // Fetch categories when company changes
    if (name === "company" && value) {
      fetchCategoriesForCompany(value)
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setUploading(true)
    try {
      const formDataToSend = new FormData()
      Array.from(files).forEach((file) => {
        formDataToSend.append("files", file)
      })

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataToSend,
      })

      if (!res.ok) throw new Error("Upload failed")

      const data = await res.json()
      setImageUrls((prev) => [...prev, ...data.urls])
    } catch (error) {
      setMessage("Error uploading images. Please try again.")
      console.error("Error:", error)
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImageUrls((prev) => [...prev, imageUrlInput.trim()])
      setImageUrlInput("")
    }
  }

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddSize = () => {
    if (!sizeInput.size || sizeInput.quantity <= 0 || sizeInput.price <= 0) {
      setMessage("Please fill in all size fields with valid values")
      return
    }

    setSizes((prev) => {
      if (editingSizeIndex !== null) {
        return prev.map((size, index) => (index === editingSizeIndex ? { ...sizeInput } : size))
      }
      return [...prev, { ...sizeInput }]
    })

    setSizeInput(createEmptySize())
    setEditingSizeIndex(null)
    setMessage("")
  }

  const removeSize = (index: number) => {
    setSizes((prev) => prev.filter((_, i) => i !== index))
    if (editingSizeIndex === index) {
      setSizeInput(createEmptySize())
      setEditingSizeIndex(null)
    }
  }

  const handleEditSize = (index: number) => {
    const sizeToEdit = sizes[index]
    setSizeInput({ ...sizeToEdit })
    setEditingSizeIndex(index)
  }

  const handleCancelEditSize = () => {
    setSizeInput(createEmptySize())
    setEditingSizeIndex(null)
  }

  const handleResultFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setUploadingResult(true)
    try {
      const formDataToSend = new FormData()
      Array.from(files).forEach((file) => {
        formDataToSend.append("files", file)
      })

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataToSend,
      })

      if (!res.ok) throw new Error("Upload failed")

      const data = await res.json()
      if (data.urls && data.urls[0]) {
        setResultImageUrl(data.urls[0])
      }
    } catch (error) {
      setMessage("Error uploading result image. Please try again.")
      console.error("Error:", error)
    } finally {
      setUploadingResult(false)
      e.target.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (imageUrls.length === 0) {
      setMessage("Please add at least one image.")
      return
    }

    setSubmitting(true)
    setMessage("")

    try {
      const bodyData = {
        ...formData,
        image: imageUrls[0],
        images: imageUrls,
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
        stock: Number(formData.stock),
        ingredients:
          typeof formData.ingredients === "string"
            ? formData.ingredients.split(",").map((i) => i.trim()).filter(Boolean)
            : formData.ingredients,
        benefits:
          typeof formData.benefits === "string"
            ? formData.benefits.split(",").map((b) => b.trim()).filter(Boolean)
            : formData.benefits,
        suitableFor:
          typeof formData.suitableFor === "string"
            ? formData.suitableFor.split(",").map((s) => s.trim()).filter(Boolean)
            : formData.suitableFor,
        results,
        sizes: sizes.map((s) => ({
          ...s,
          quantity: Number(s.quantity),
          price: Number(s.price),
          discountPrice: s.discountPrice ? Number(s.discountPrice) : undefined,
          stock: Number(s.stock),
        })),
      }

      // console.log("📤 Updating product with:", bodyData)
      // console.log("🎨 Results being sent:", results)
      // console.log("✅ Suitable For being sent:", bodyData.suitableFor)

      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      })

      const responseData = await res.json()
      // console.log("📥 Update API Response:", responseData)

      if (!res.ok) {
        console.error("❌ Update API Error:", responseData)
        throw new Error(responseData.error || "Failed to update product")
      }

      // console.log("✅ Product updated:", responseData)
      setMessage("Product updated successfully!")
      setTimeout(() => router.push("/admin/products"), 1500)
    } catch (error) {
      setMessage("Error updating product. Please try again.")
      console.error("Error:", error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading product...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/admin/products">
          <Button variant="ghost" className="mb-6 bg-transparent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Edit Product</h1>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Product Name *</label>
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter product name"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
                  <Input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    placeholder="Product slug"
                    className="bg-background border-border"
                  />
                </div>
              </div>

              {/* Company & Category */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Company *</label>
                  <select
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="">Select Company</option>
                    {companies.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Main Category *</label>
                  <select
                    name="mainCategory"
                    value={formData.mainCategory || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="">Select Main Category</option>
                    {categories
                      .filter(c => !c.parent)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Sub Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="">Select Sub Category</option>
                    {categories
                      .find(c => c._id === formData.mainCategory)
                      ?.subCategories?.map((sub) => (
                        <option key={sub._id} value={sub._id}>
                          {sub.name}
                        </option>
                      )) || []}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter product description"
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Price (₹) *</label>
                  <Input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    placeholder="0"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Discount Price (₹)</label>
                  <Input
                    type="number"
                    name="discountPrice"
                    value={formData.discountPrice || ""}
                    onChange={handleChange}
                    placeholder="0"
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Stock *</label>
                  <Input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    required
                    placeholder="0"
                    className="bg-background border-border"
                  />
                </div>
              </div>

              {/* Images Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Product Images *</label>
                <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition">
                        <div className="text-center">
                          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">Upload from Machine</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Add Image URL</label>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          className="bg-background border-border flex-1"
                        />
                        <Button
                          type="button"
                          onClick={() => {
                            if (imageUrlInput.trim()) {
                              setImageUrls((prev) => [...prev, imageUrlInput.trim()])
                              setImageUrlInput("")
                            }
                          }}
                          variant="outline"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}

                  {imageUrls.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Added Images ({imageUrls.length})</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {imageUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="relative h-24 bg-muted rounded-lg overflow-hidden">
                              <Image
                                src={url}
                                alt={`Product ${index + 1}`}
                                fill
                                className="object-cover"
                              />
                              {index === 0 && (
                                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                                  Main
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1  text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">SKU</label>
                <Input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="SKU-001"
                  className="bg-background border-border"
                />
              </div>

              {/* Product Sizes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-4">Product Sizes (Optional - Add size variants)</label>
                <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/50">
                  {/* Add Size Form */}
                  <div className="space-y-3 pb-4 border-b border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Size Name *</label>
                        <Input
                          type="text"
                          placeholder="e.g., 50ml, 100ml, 1L"
                          value={sizeInput.size}
                          onChange={(e) => setSizeInput({ ...sizeInput, size: e.target.value })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Unit *</label>
                        <select
                          value={sizeInput.unit}
                          onChange={(e) => setSizeInput({ ...sizeInput, unit: e.target.value as "ml" | "l" | "g" | "kg" })}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                        >
                          <option value="ml">Milliliters (ml)</option>
                          <option value="l">Liters (l)</option>
                          <option value="g">Grams (g)</option>
                          <option value="kg">Kilograms (kg)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Quantity *</label>
                        <Input
                          type="number"
                          placeholder="e.g., 50"
                          value={sizeInput.quantity || ""}
                          onChange={(e) => setSizeInput({ ...sizeInput, quantity: Number(e.target.value) })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Price (₹) *</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={sizeInput.price || ""}
                          onChange={(e) => setSizeInput({ ...sizeInput, price: Number(e.target.value) })}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Discount Price (₹)</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={sizeInput.discountPrice || ""}
                          onChange={(e) => setSizeInput({ ...sizeInput, discountPrice: Number(e.target.value) || 0 })}
                          className="bg-background border-border"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Stock *</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={sizeInput.stock || ""}
                          onChange={(e) => setSizeInput({ ...sizeInput, stock: Number(e.target.value) })}
                          className="bg-background border-border"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Size SKU (Optional)</label>
                      <Input
                        type="text"
                        placeholder="e.g., SKU-50ML"
                        value={sizeInput.sku || ""}
                        onChange={(e) => setSizeInput({ ...sizeInput, sku: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        type="button"
                        onClick={handleAddSize}
                        variant="outline"
                        className="w-full"
                      >
                        {editingSizeIndex !== null ? "Update Size" : "Add Size"}
                      </Button>
                      {editingSizeIndex !== null && (
                        <Button
                          type="button"
                          onClick={handleCancelEditSize}
                          variant="secondary"
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Display Added Sizes */}
                  {sizes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Added Sizes ({sizes.length})</label>
                      <div className="space-y-2">
                        {sizes.map((size, index) => (
                          <div
                            key={index}
                            className="relative group border border-border rounded-lg p-3 bg-background flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm text-foreground">
                                {size.size} ({size.quantity}{size.unit})
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Price: ₹{size.price}
                                {size.discountPrice ? ` → ₹${size.discountPrice}` : ""}
                                {" "} | Stock: {size.stock}
                              </p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 md:flex-none"
                                onClick={() => handleEditSize(index)}
                              >
                                <Pencil className="w-4 h-4 mr-1" /> Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                className="flex-1 md:flex-none"
                                onClick={() => removeSize(index)}
                              >
                                <X className="w-4 h-4 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ingredients & Benefits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ingredients (comma-separated)
                  </label>
                  <textarea
                    name="ingredients"
                    value={Array.isArray(formData.ingredients) ? formData.ingredients.join(", ") : formData.ingredients}
                    onChange={handleChange}
                    placeholder="Ingredient 1, Ingredient 2, Ingredient 3"
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Benefits (comma-separated)</label>
                  <textarea
                    name="benefits"
                    value={Array.isArray(formData.benefits) ? formData.benefits.join(", ") : formData.benefits}
                    onChange={handleChange}
                    placeholder="Benefit 1, Benefit 2, Benefit 3"
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  />
                </div>
              </div>

              {/* Usage */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Usage Instructions</label>
                <textarea
                  name="usage"
                  value={formData.usage}
                  onChange={handleChange}
                  placeholder="Enter usage instructions"
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>

              {/* Suitable For */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Suitable For (comma-separated)</label>
                <textarea
                  name="suitableFor"
                  value={Array.isArray(formData.suitableFor) ? formData.suitableFor.join(", ") : formData.suitableFor}
                  onChange={handleChange}
                  placeholder="Suitable for 1, Suitable for 2, Suitable for 3"
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>

              {/* Results Section */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-4">Product Results</label>
                <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/50">
                  {/* Add Result Form */}
                  <div className="space-y-3 pb-4 border-b border-border">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Result Title</label>
                      <Input
                        type="text"
                        placeholder="e.g., Brightening Results"
                        value={resultInput.title}
                        onChange={(e) => setResultInput({ ...resultInput, title: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Result Description</label>
                      <textarea
                        placeholder="Describe the result"
                        value={resultInput.text}
                        onChange={(e) => setResultInput({ ...resultInput, text: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Result Image</label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={resultImageUrl}
                            onChange={(e) => setResultImageUrl(e.target.value)}
                            className="bg-background border-border flex-1"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (resultImageUrl.trim() && resultInput.title.trim()) {
                                setResults([...results, { image: resultImageUrl.trim(), title: resultInput.title, text: resultInput.text }])
                                setResultInput({ image: "", title: "", text: "" })
                                setResultImageUrl("")
                              }
                            }}
                            variant="outline"
                          >
                            Add Result
                          </Button>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-2">Or upload from device:</p>
                          <label className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition">
                            <div className="text-center">
                              <Upload className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                              <p className="text-xs font-medium text-foreground">Upload Image</p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleResultFileUpload}
                              disabled={uploadingResult}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Display Added Results */}
                  {results.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Added Results ({results.length})</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {results.map((result, index) => (
                          <div key={index} className="relative group border border-border rounded-lg p-3 bg-background">
                            {result.image && (
                              <div className="relative h-24 bg-muted rounded mb-2 overflow-hidden">
                                <Image
                                  src={result.image}
                                  alt={result.title}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <h4 className="font-medium text-sm text-foreground">{result.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">{result.text}</p>
                            <button
                              type="button"
                              onClick={() => setResults(results.filter((_, i) => i !== index))}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium text-foreground">Active</label>
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`p-3 rounded text-sm ${message.includes("successfully") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                >
                  {message}
                </div>
              )}

              {/* Submit Button */}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Updating..." : "Update Product"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
