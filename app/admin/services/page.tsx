"use client";

// /admin/services — everything about the public /services page that an
// admin decides: the navbar switch, the service categories and the featured
// vendors. Data: GET /api/admin/services; changes go to
// /api/admin/services/{nav,featured,categories}, which log each one
// (lib/services-admin.ts). The page reloads after every change so counts and
// statuses are always the server's.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ExternalLink, GripVertical, Loader2, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  SERVICE_CATEGORY_NAME_MAX_LENGTH,
  STARTING_SERVICE_CATEGORIES,
} from "@/lib/service-category-rules";
import type {
  AdminServiceCategory,
  AdminServicesOverview,
  AdminServicesVendor,
} from "@/lib/services-admin";

type Names = { en: string; ar: string; hi: string };
const EMPTY_NAMES: Names = { en: "", ar: "", hi: "" };

/** A row that can be dragged to a new place; `handleLabel` names its grip for screen readers. */
function SortableRow({
  id,
  handleLabel,
  disabled,
  children,
}: {
  id: string;
  handleLabel: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className="flex items-center gap-3 rounded-lg border bg-white p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={handleLabel}
        disabled={disabled}
        className="text-muted-foreground cursor-grab touch-none active:cursor-grabbing disabled:cursor-not-allowed"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      {children}
    </li>
  );
}

export default function AdminServicesPage() {
  const t = useTranslations("AdminServicesPage");
  const { toast } = useToast();
  const [data, setData] = useState<AdminServicesOverview | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const [newNames, setNewNames] = useState<Names>(EMPTY_NAMES);
  const [editing, setEditing] = useState<(Names & { id: string; slug: string }) | null>(null);
  const [removing, setRemoving] = useState<AdminServiceCategory | null>(null);
  const [search, setSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/services");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error("load failed");
      setData(json);
      setLoadFailed(false);
    } catch (error) {
      console.error("Failed to load services settings:", error);
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const errorText = (json: any) => {
    switch (json?.reason) {
      case "NAME_REQUIRED":
        return t("errorNameRequired");
      case "NAME_TOO_LONG":
        return t("errorNameTooLong", { max: SERVICE_CATEGORY_NAME_MAX_LENGTH });
      case "NAME_TAKEN":
        return t("errorNameTaken");
      case "NOT_EMPTY":
        return t("errorNotEmpty");
      case "SHOPS":
        return t("errorShops");
      default:
        return t("errorGeneric");
    }
  };

  /** Sends one change, says so if it was refused, then reloads. Returns the reply, or null. */
  const send = async (url: string, method: "POST" | "PUT" | "DELETE", body?: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        toast({ title: t("saveFailedTitle"), description: errorText(json), variant: "destructive" });
        return null;
      }
      return json;
    } catch (error) {
      console.error("Services settings change failed:", error);
      toast({ title: t("saveFailedTitle"), description: t("errorGeneric"), variant: "destructive" });
      return null;
    } finally {
      await load();
      setBusy(false);
    }
  };

  const categoryLabel = useMemo(() => {
    const byId = new Map((data?.categories ?? []).map((c) => [c._id, c.name.en]));
    return (id: string | null) => (id ? (byId.get(id) ?? t("noCategory")) : t("noCategory"));
  }, [data, t]);

  if (!data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        {loadFailed ? (
          <>
            <p className="text-muted-foreground">{t("loadFailed")}</p>
            <Button variant="outline" onClick={load}>
              {t("retry")}
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
          </p>
        )}
      </div>
    );
  }

  const featuredIds = data.featured.map((f) => f._id);
  const searchResults = data.vendors
    .filter((v) => !featuredIds.includes(v._id))
    .filter((v) => v.shopName.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 8);

  const onCategoriesDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = data.categories.map((c) => c._id);
    const order = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setData({ ...data, categories: order.map((id) => data.categories.find((c) => c._id === id)!) });
    send("/api/admin/services/categories", "PUT", { order });
  };

  const onFeaturedDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const shopIds = arrayMove(featuredIds, featuredIds.indexOf(String(active.id)), featuredIds.indexOf(String(over.id)));
    setData({ ...data, featured: shopIds.map((id) => data.featured.find((f) => f._id === id)!) });
    send("/api/admin/services/featured", "PUT", { shopIds });
  };

  const nameInputs = (names: Names, set: (names: Names) => void, idPrefix: string) => (
    <div className="grid gap-3 sm:grid-cols-3">
      {(["en", "ar", "hi"] as const).map((locale) => (
        <div key={locale} className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-${locale}`}>
            {t(locale === "en" ? "nameEn" : locale === "ar" ? "nameAr" : "nameHi")}
          </Label>
          <Input
            id={`${idPrefix}-${locale}`}
            value={names[locale]}
            dir={locale === "ar" ? "rtl" : undefined}
            maxLength={SERVICE_CATEGORY_NAME_MAX_LENGTH}
            onChange={(e) => set({ ...names, [locale]: e.target.value })}
            disabled={busy}
          />
        </div>
      ))}
    </div>
  );

  const vendorLine = (vendor: AdminServicesVendor) => (
    <>
      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg text-sm font-bold text-amber-600">
        {vendor.logo ? (
          <Image src={vendor.logo} alt="" width={40} height={40} className="h-full w-full object-cover" />
        ) : (
          (vendor.shopName || "?").slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{vendor.shopName || t("notShown_missing")}</p>
        <p className="text-muted-foreground truncate text-xs">
          {[vendor.city, categoryLabel(vendor.serviceCategory)].filter(Boolean).join(" · ")}
        </p>
      </div>
      {vendor.notShown && (
        <Badge variant="secondary" className="shrink-0">
          {t("notShownPrefix")} {t(`notShown_${vendor.notShown}`)}
        </Badge>
      )}
    </>
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {/* Navbar switch */}
      <Card>
        <CardHeader>
          <CardTitle>{t("navTitle")}</CardTitle>
          <CardDescription>{t("navDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Switch
              id="services-nav"
              checked={data.navEnabled}
              onCheckedChange={(enabled) => send("/api/admin/services/nav", "PUT", { enabled })}
              disabled={busy}
            />
            <Label htmlFor="services-nav" className="text-sm">
              {data.navEnabled ? t("navOn") : t("navOff")}
            </Label>
          </div>
          <a
            href="/services"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            <ExternalLink className="h-4 w-4" /> {t("preview")}
          </a>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>{t("categoriesTitle")}</CardTitle>
          <CardDescription>{t("categoriesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {data.categories.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-center">
              <p className="font-medium">{t("noCategoriesTitle")}</p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-xl text-sm">
                {t("noCategoriesBody", { names: STARTING_SERVICE_CATEGORIES.map((c) => c.en).join(", ") })}
              </p>
              <Button className="mt-4" onClick={() => send("/api/admin/services/categories/starting", "POST")} disabled={busy}>
                <Plus className="me-2 h-4 w-4" /> {t("addStarting")}
              </Button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onCategoriesDragEnd}>
              <SortableContext items={data.categories.map((c) => c._id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {data.categories.map((category) => (
                    <SortableRow key={category._id} id={category._id} handleLabel={t("dragToReorder")} disabled={busy}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{category.name.en}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {[category.name.ar, category.name.hi].filter(Boolean).join(" · ") || t("noTranslations")}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {t("vendorCount", { count: category.vendorCount })}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing({ ...EMPTY_NAMES, ...category.name, id: category._id, slug: category.slug })}
                        disabled={busy}
                        aria-label={t("editNamed", { name: category.name.en })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRemoving(category)}
                        disabled={busy}
                        aria-label={t("removeNamed", { name: category.name.en })}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </SortableRow>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          <form
            className="space-y-3 border-t pt-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await send("/api/admin/services/categories", "POST", { name: newNames })) {
                setNewNames(EMPTY_NAMES);
                toast({ title: t("savedToast") });
              }
            }}
          >
            <p className="text-sm font-medium">{t("addCategory")}</p>
            {nameInputs(newNames, setNewNames, "new-category")}
            <p className="text-muted-foreground text-xs">{t("fallbackHint")}</p>
            <Button type="submit" disabled={busy || !newNames.en.trim()}>
              <Plus className="me-2 h-4 w-4" /> {t("addCategory")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Featured vendors */}
      <Card>
        <CardHeader>
          <CardTitle>{t("featuredTitle")}</CardTitle>
          <CardDescription>{t("featuredDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {data.featured.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noFeatured")}</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onFeaturedDragEnd}>
              <SortableContext items={featuredIds} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {data.featured.map((vendor) => (
                    <SortableRow key={vendor._id} id={vendor._id} handleLabel={t("dragToReorder")} disabled={busy}>
                      {vendorLine(vendor)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          send("/api/admin/services/featured", "PUT", {
                            shopIds: featuredIds.filter((id) => id !== vendor._id),
                          })
                        }
                        disabled={busy}
                        aria-label={t("unfeatureNamed", { name: vendor.shopName || vendor._id })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </SortableRow>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          <div className="space-y-3 border-t pt-4">
            <Label htmlFor="feature-search">{t("addFeaturedLabel")}</Label>
            <div className="relative">
              <Search className="text-muted-foreground absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                id="feature-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchVendors")}
                className="ps-9"
              />
            </div>
            {searchResults.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noVendorsFound")}</p>
            ) : (
              <ul className="space-y-2">
                {searchResults.map((vendor) => (
                  <li key={vendor._id} className="flex items-center gap-3 rounded-lg border p-3">
                    {vendorLine(vendor)}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => send("/api/admin/services/featured", "PUT", { shopIds: [...featuredIds, vendor._id] })}
                      disabled={busy}
                    >
                      <Star className="me-2 h-4 w-4" /> {t("feature")}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rename */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && !busy && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("editCategoryTitle")}</DialogTitle>
            <DialogDescription>{t("editCategoryDescription", { slug: editing?.slug ?? "" })}</DialogDescription>
          </DialogHeader>
          {editing && nameInputs(editing, (names) => setEditing({ ...editing, ...names }), "edit-category")}
          <p className="text-muted-foreground text-xs">{t("fallbackHint")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>
              {t("cancel")}
            </Button>
            <Button
              disabled={busy || !editing?.en.trim()}
              onClick={async () => {
                if (!editing) return;
                const { id, en, ar, hi } = editing;
                if (await send(`/api/admin/services/categories/${id}`, "PUT", { name: { en, ar, hi } })) {
                  setEditing(null);
                  toast({ title: t("savedToast") });
                }
              }}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove */}
      <AlertDialog open={removing !== null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeCategoryTitle", { name: removing?.name.en ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {removing && removing.vendorCount > 0
                ? t("removeCategoryInUse", { count: removing.vendorCount })
                : t("removeCategoryUnused")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                const category = removing;
                setRemoving(null);
                if (category && (await send(`/api/admin/services/categories/${category._id}`, "DELETE"))) {
                  toast({ title: t("removedToast") });
                }
              }}
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
