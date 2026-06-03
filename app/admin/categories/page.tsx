"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Plus, Image as ImageIcon } from "lucide-react";
import { ImageUploadField } from "@/components/admin/image-upload-field";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent?: { _id: string; name: string; slug: string };
  isActive: boolean;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image: "",
    parent: "",
    isActive: true,
  });

  useEffect(() => {
    if (!session) {
      router.push("/auth/login");
      return;
    }

    fetchData();
  }, [session, router]);

  const fetchData = async () => {
    try {
      const categoriesRes = await fetch("/api/categories?all=true&flat=true");
      const categoriesData = await categoriesRes.json();

      if (categoriesRes.ok && Array.isArray(categoriesData)) {
        setCategories(categoriesData);
      } else {
        console.error("Failed to fetch categories:", categoriesData);
        setCategories([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save category");

      await fetchData();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: "",
        slug: "",
        description: "",
        image: "",
        parent: "",
        isActive: true,
      });
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: category.image || "",
      parent: category.parent?._id || "",
      isActive: category.isActive,
    });
    setEditingId(category._id);
    setShowForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/categories/${categoryId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      await fetchData();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      image: "",
      parent: "",
      isActive: true,
    });
  };

  if (loading) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading categories...</p>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-foreground text-3xl font-bold">Categories Management</h1>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-foreground mb-2 block text-sm font-medium">
                      Category Name *
                    </label>
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
                    <label className="text-foreground mb-2 block text-sm font-medium">Slug</label>
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
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Parent Category
                  </label>
                  <select
                    name="parent"
                    value={formData.parent}
                    onChange={handleChange}
                    className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                  >
                    <option value="">Select Parent (Main Category)</option>
                    {categories
                      .filter((c) => !c.parent)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <ImageUploadField
                    label="Category Image"
                    value={formData.image}
                    onChange={(url) => setFormData((prev) => ({ ...prev, image: url }))}
                    folder="categories"
                    placeholder="Enter image URL or upload"
                  />
                </div>

                <div>
                  <label className="text-foreground mb-2 block text-sm font-medium">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter category description"
                    rows={3}
                    className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <label className="text-foreground text-sm font-medium">Active</label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingId ? "Update Category" : "Create Category"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 bg-transparent"
                  >
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
              <p className="text-muted-foreground py-8 text-center">No categories found</p>
            ) : (
              <div className="space-y-4">
                {categories
                  .filter((c) => !c.parent)
                  .map((mainCategory) => (
                    <div key={mainCategory._id} className="border-border rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {mainCategory.image ? (
                            <img
                              src={mainCategory.image}
                              alt={mainCategory.name}
                              className="border-border h-10 w-10 rounded border object-cover"
                            />
                          ) : (
                            <div className="bg-muted border-border flex h-10 w-10 items-center justify-center rounded border">
                              <ImageIcon className="text-muted-foreground h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-foreground font-semibold">{mainCategory.name}</h3>
                              <span className="text-muted-foreground text-xs">
                                ({mainCategory.slug})
                              </span>
                            </div>
                          </div>
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              mainCategory.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
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
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(mainCategory._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {mainCategory.description && (
                        <p className="text-muted-foreground mb-3 text-sm">
                          {mainCategory.description}
                        </p>
                      )}
                      <div className="ml-6 space-y-2">
                        {categories
                          .filter((c) => c.parent && c.parent._id === mainCategory._id)
                          .map((subCategory) => (
                            <div
                              key={subCategory._id}
                              className="bg-muted/30 flex items-center justify-between rounded p-2"
                            >
                              <div className="flex items-center gap-3">
                                {subCategory.image ? (
                                  <img
                                    src={subCategory.image}
                                    alt={subCategory.name}
                                    className="border-border h-8 w-8 rounded border object-cover"
                                  />
                                ) : (
                                  <div className="bg-muted border-border flex h-8 w-8 items-center justify-center rounded border">
                                    <ImageIcon className="text-muted-foreground h-4 w-4" />
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <span className="text-foreground text-sm font-medium">
                                    • {subCategory.name}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    ({subCategory.slug})
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(subCategory)}
                                  className="bg-transparent"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(subCategory._id)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
  );
}
