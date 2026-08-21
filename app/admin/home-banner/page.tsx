"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, GripVertical, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface HomeBanner {
  _id: string;
  imageUrl: string;
  title?: string;
  description?: string;
  linkType: "product" | "shop" | "url" | "none";
  linkValue?: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyForm = {
  imageUrl: "",
  title: "",
  description: "",
  linkType: "none" as HomeBanner["linkType"],
  linkValue: "",
  isActive: true,
};

function SortableBannerRow({
  banner,
  onEdit,
  onDelete,
}: {
  banner: HomeBanner;
  onEdit: (b: HomeBanner) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: banner._id,
  });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <button
          {...attributes}
          {...listeners}
          className="text-muted-foreground cursor-grab touch-none active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <img
          src={banner.imageUrl}
          alt={banner.title || "Banner"}
          className="h-16 w-28 flex-shrink-0 rounded object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{banner.title || "Untitled slide"}</p>
            <Badge variant={banner.isActive ? "default" : "secondary"}>
              {banner.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">
              {banner.linkType === "none" ? "No link" : `Links to ${banner.linkType}`}
            </Badge>
          </div>
          {banner.description && (
            <p className="text-muted-foreground truncate text-sm">{banner.description}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(banner)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(banner._id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomeBannerPage() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HomeBanner | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/admin/home-banner");
      if (res.ok) {
        setBanners(await res.json());
      } else {
        toast({ title: "Error", description: "Failed to fetch banners", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast({ title: "Error", description: "Failed to fetch banners", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("files", files[0]);
      formDataToSend.append("folder", "link-and-smile/home-banner");

      const res = await fetch("/api/upload", { method: "POST", body: formDataToSend });
      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setFormData((prev) => ({ ...prev, imageUrl: data.urls[0] }));
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      toast({ title: "Error", description: "Please upload an image first", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const url = editingBanner ? `/api/admin/home-banner/${editingBanner._id}` : "/api/admin/home-banner";
      const method = editingBanner ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({ title: "Success", description: `Banner ${editingBanner ? "updated" : "created"}` });
        resetForm();
        fetchBanners();
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to save banner", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error saving banner:", error);
      toast({ title: "Error", description: "Failed to save banner", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (banner: HomeBanner) => {
    setEditingBanner(banner);
    setFormData({
      imageUrl: banner.imageUrl,
      title: banner.title || "",
      description: banner.description || "",
      linkType: banner.linkType,
      linkValue: banner.linkValue || "",
      isActive: banner.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner slide?")) return;
    try {
      const res = await fetch(`/api/admin/home-banner/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Success", description: "Banner deleted" });
        setBanners((prev) => prev.filter((b) => b._id !== id));
      } else {
        toast({ title: "Error", description: "Failed to delete banner", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast({ title: "Error", description: "Failed to delete banner", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingBanner(null);
    setShowForm(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex((b) => b._id === active.id);
    const newIndex = banners.findIndex((b) => b._id === over.id);
    const reordered = arrayMove(banners, oldIndex, newIndex);
    setBanners(reordered);

    try {
      await fetch("/api/admin/home-banner/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((b) => b._id) }),
      });
    } catch (error) {
      console.error("Error saving new order:", error);
      toast({ title: "Error", description: "Failed to save new order", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Loading banners...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="m-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Home Banner</h1>
          <p className="text-muted-foreground">Manage the homepage hero carousel slides</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="mr-2 h-4 w-4" />
          Add Slide
        </Button>
      </div>

      {showForm && (
        <Card className="mx-6">
          <CardHeader>
            <CardTitle>{editingBanner ? "Edit Slide" : "Add New Slide"}</CardTitle>
            <CardDescription>
              {editingBanner ? "Update this banner slide" : "Add a new homepage carousel slide"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Image</Label>
                {formData.imageUrl && (
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="h-32 w-full max-w-md rounded object-cover"
                  />
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                    id="banner-image-upload"
                  />
                  <Label
                    htmlFor="banner-image-upload"
                    className="border-input hover:bg-accent inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {uploading ? "Uploading..." : formData.imageUrl ? "Replace image" : "Upload image"}
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Link Type</Label>
                  <Select
                    value={formData.linkType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, linkType: v as HomeBanner["linkType"], linkValue: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No link</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="shop">Shop</SelectItem>
                      <SelectItem value="url">Custom URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.linkType !== "none" && (
                  <div className="space-y-2">
                    <Label htmlFor="linkValue">
                      {formData.linkType === "product" && "Product ID"}
                      {formData.linkType === "shop" && "Shop ID"}
                      {formData.linkType === "url" && "URL"}
                    </Label>
                    <Input
                      id="linkValue"
                      value={formData.linkValue}
                      onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
                      placeholder={
                        formData.linkType === "url"
                          ? "https://example.com"
                          : "Paste the ID from its admin page URL"
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting || uploading}>
                  {isSubmitting ? "Saving..." : editingBanner ? "Update Slide" : "Create Slide"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mx-6 grid gap-3">
        {banners.length === 0 ? (
          <Card>
            <CardContent className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">No banner slides yet. Add your first one above.</p>
            </CardContent>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={banners.map((b) => b._id)} strategy={verticalListSortingStrategy}>
              {banners.map((banner) => (
                <SortableBannerRow
                  key={banner._id}
                  banner={banner}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
