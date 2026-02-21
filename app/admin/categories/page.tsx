"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Edit2, Plus } from "lucide-react"

interface Category {
  _id: string
  name: string
  slug: string
  description?: string
  parent?: { _id: string; name: string; slug: string }
  isActive: boolean
}

export default function CategoriesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    parent: "",
    isActive: true,
  })

  useEffect(() => {
    if (!session) {
      router.push("/auth/login")
      return
    }

    fetchData()
  }, [session, router])

  const fetchData = async () => {
    try {
      const categoriesRes = await fetch("/api/categories?all=true&flat=true")
      const categoriesData = await categoriesRes.json()

      if (categoriesRes.ok && Array.isArray(categoriesData)) {
        setCategories(categoriesData)
      } else {
        console.error("Failed to fetch categories:", categoriesData)
        setCategories([])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error("Failed to save category")

      await fetchData()
      setShowForm(false)
      setEditingId(null)
      setFormData({
        name: "",
        slug: "",
        description: "",
        parent: "",
        isActive: true,
      })
    } catch (error) {
      console.error("Error saving category:", error)
    }
  }

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      parent: category.parent?._id || "",
      isActive: category.isActive,
    })
    setEditingId(category._id)
    setShowForm(true)
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return

    try {
      const res = await fetch(`/api/categories/${categoryId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete category")
      await fetchData()
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: "",
      slug: "",
      description: "",
      parent: "",
      isActive: true,
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading categories...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Categories Management</h1>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingId ? "Edit Category" : "Add New Category"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Category Name *</label>
                    <Input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter category name"
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
                      placeholder="Auto-generated if empty"
                      className="bg-background border-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Parent Category</label>
                  <select
                    name="parent"
                    value={formData.parent}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="">Select Parent (Main Category)</option>
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
                  <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter category description"
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  />
                </div>

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

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingId ? "Update Category" : "Create Category"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No categories found</p>
            ) : (
              <div className="space-y-4">
                {categories
                  .filter(c => !c.parent)
                  .map((mainCategory) => (
                    <div key={mainCategory._id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{mainCategory.name}</h3>
                          <span className="text-xs text-muted-foreground">({mainCategory.slug})</span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${mainCategory.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                              }`}
                          >
                            {mainCategory.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(mainCategory)}
                            className="bg-transparent"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(mainCategory._id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {mainCategory.description && (
                        <p className="text-sm text-muted-foreground mb-3">{mainCategory.description}</p>
                      )}
                      <div className="ml-6 space-y-2">
                        {categories
                          .filter(c => c.parent && c.parent._id === mainCategory._id)
                          .map((subCategory) => (
                            <div key={subCategory._id} className="flex items-center justify-between bg-muted/30 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">• {subCategory.name}</span>
                                <span className="text-xs text-muted-foreground">({subCategory.slug})</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${subCategory.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                    }`}
                                >
                                  {subCategory.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(subCategory)}
                                  className="bg-transparent"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(subCategory._id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
