// components/shop/storefront-editor.tsx
//
// Edits what customers see on a shop's public page (app/shop/[slug]): the
// store type (products, services or both), banner, logo and description.
// Used by the vendor for their own shop (app/vendor/settings) and by an
// admin for any shop (app/admin/vendors/[id]) — only the endpoint differs.
//
// A chosen image is checked here and previewed from the local file; nothing
// is uploaded until Save. The server (lib/shop-storefront.ts) repeats every
// check with the same rules (lib/shop-storefront-rules.ts).
"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ExternalLink, ImagePlus, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  IMAGE_SIGNATURE_BYTES,
  STOREFRONT_DESCRIPTION_MAX_LENGTH,
  STOREFRONT_IMAGE_ACCEPT,
  STOREFRONT_IMAGE_MAX_BYTES,
  STOREFRONT_REMOVE_FIELD,
  checkStorefrontImage,
  type StorefrontErrorReason,
  type StorefrontImageKind,
} from "@/lib/shop-storefront-rules";
import { STORE_TYPES, storeTypeOf, type StoreType } from "@/lib/shop-store-type";
import { categoryName, type ServiceCategoryName } from "@/lib/service-category-rules";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface StorefrontShop {
  shopName: string;
  slug?: string;
  /** Missing on shops saved before store types existed; read as "products". */
  storeType?: string | null;
  /** The /services category id, if one is chosen. */
  serviceCategory?: string | null;
  description?: string | null;
  logo?: string | null;
  coverImage?: string | null;
  isApproved?: boolean;
  isActive?: boolean;
}

export interface StorefrontSaved {
  storeType: StoreType;
  serviceCategory: string | null;
  description: string;
  logo: string | null;
  coverImage: string | null;
}

interface StorefrontEditorProps {
  /** PUT target: /api/vendor/storefront or /api/admin/vendors/[id]/storefront. */
  endpoint: string;
  shop: StorefrontShop;
  onSaved?: (saved: StorefrontSaved) => void;
}

// A newly chosen file, a pending removal, or null for "as saved".
type ImageEdit = { file: File; previewUrl: string } | "remove" | null;
type Field = StorefrontImageKind | "description" | "storeType" | "serviceCategory";

// Radix Select cannot use an empty string as a value.
const NO_CATEGORY = "none";

const KINDS: StorefrontImageKind[] = ["banner", "logo"];
const SAVED_FIELD = { logo: "logo", banner: "coverImage" } as const;
const STORE_TYPE_LABEL = {
  products: "storeTypeProducts",
  services: "storeTypeServices",
  both: "storeTypeBoth",
} as const;
const STORE_TYPE_DESCRIPTION = {
  products: "storeTypeProductsDesc",
  services: "storeTypeServicesDesc",
  both: "storeTypeBothDesc",
} as const;
const megabytes = (bytes: number) => bytes / (1024 * 1024);

export function StorefrontEditor({ endpoint, shop, onSaved }: StorefrontEditorProps) {
  const t = useTranslations("StorefrontEditor");
  const locale = useLocale();
  const { toast } = useToast();
  // The /services categories to choose from (app/api/services/categories).
  const [categories, setCategories] = useState<{ _id: string; name: ServiceCategoryName }[]>([]);
  useEffect(() => {
    fetch("/api/services/categories")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCategories(Array.isArray(data?.categories) ? data.categories : []))
      .catch(() => {});
  }, []);

  const [saved, setSaved] = useState<StorefrontSaved>({
    storeType: storeTypeOf(shop),
    serviceCategory: shop.serviceCategory ?? null,
    description: shop.description ?? "",
    logo: shop.logo ?? null,
    coverImage: shop.coverImage ?? null,
  });
  const [storeType, setStoreType] = useState<StoreType>(saved.storeType);
  const [serviceCategory, setServiceCategory] = useState<string | null>(saved.serviceCategory);
  const [description, setDescription] = useState(saved.description);
  const [edits, setEdits] = useState<Record<StorefrontImageKind, ImageEdit>>({
    logo: null,
    banner: null,
  });
  const [errors, setErrors] = useState<Partial<Record<Field | "form", string>>>({});
  const [saving, setSaving] = useState(false);

  const fileInputs = useRef<Record<StorefrontImageKind, HTMLInputElement | null>>({
    logo: null,
    banner: null,
  });

  // Local previews are object URLs; release each one when it is replaced
  // and whatever is left when the editor goes away.
  const editsRef = useRef(edits);
  editsRef.current = edits;
  const release = (edit: ImageEdit) => {
    if (edit && edit !== "remove") URL.revokeObjectURL(edit.previewUrl);
  };
  useEffect(() => () => KINDS.forEach((kind) => release(editsRef.current[kind])), []);

  const setEdit = (kind: StorefrontImageKind, edit: ImageEdit) => {
    release(edits[kind]);
    setEdits((prev) => ({ ...prev, [kind]: edit }));
    setErrors((prev) => ({ ...prev, [kind]: undefined, form: undefined }));
  };

  const errorText = (field: Field, reason: StorefrontErrorReason) => {
    if (reason === "DESCRIPTION_TOO_LONG") {
      return t("errorDescriptionTooLong", { max: STOREFRONT_DESCRIPTION_MAX_LENGTH });
    }
    if (reason === "STORE_TYPE") return t("errorStoreType");
    if (reason === "SERVICE_CATEGORY") return t("errorServiceCategory");
    if (reason === "IMAGE_TOO_LARGE" && (field === "logo" || field === "banner")) {
      return t("errorImageTooLarge", { maxMb: megabytes(STOREFRONT_IMAGE_MAX_BYTES[field]) });
    }
    return t("errorImageType");
  };

  const handleFileChosen = async (
    kind: StorefrontImageKind,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    // Clear the input so choosing the same file again still fires a change.
    event.target.value = "";
    if (!file) return;

    const head = new Uint8Array(await file.slice(0, IMAGE_SIGNATURE_BYTES).arrayBuffer());
    const reason = checkStorefrontImage(kind, file.size, head);
    if (reason) {
      setErrors((prev) => ({ ...prev, [kind]: errorText(kind, reason) }));
      return;
    }
    setEdit(kind, { file, previewUrl: URL.createObjectURL(file) });
  };

  /** What the preview shows for this image right now. */
  const shownImage = (kind: StorefrontImageKind): string | null => {
    const edit = edits[kind];
    if (edit === "remove") return null;
    return edit ? edit.previewUrl : saved[SAVED_FIELD[kind]];
  };

  const isDirty =
    storeType !== saved.storeType ||
    serviceCategory !== saved.serviceCategory ||
    description !== saved.description ||
    edits.logo !== null ||
    edits.banner !== null;

  const handleSave = async () => {
    setSaving(true);
    setErrors({});
    try {
      const body = new FormData();
      if (storeType !== saved.storeType) body.append("storeType", storeType);
      // An empty value clears the category.
      if (serviceCategory !== saved.serviceCategory) {
        body.append("serviceCategory", serviceCategory ?? "");
      }
      if (description !== saved.description) body.append("description", description);
      for (const kind of KINDS) {
        const edit = edits[kind];
        if (edit === "remove") body.append(STOREFRONT_REMOVE_FIELD[kind], "true");
        else if (edit) body.append(kind, edit.file);
      }

      const res = await fetch(endpoint, { method: "PUT", body });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        if (json?.field && json?.reason) {
          setErrors({ [json.field as Field]: errorText(json.field, json.reason) });
        } else {
          setErrors({ form: json?.message || t("saveFailed") });
        }
        return;
      }

      const next: StorefrontSaved = {
        storeType: storeTypeOf(json.shop),
        serviceCategory: json.shop.serviceCategory ?? null,
        description: json.shop.description ?? "",
        logo: json.shop.logo ?? null,
        coverImage: json.shop.coverImage ?? null,
      };
      KINDS.forEach((kind) => release(edits[kind]));
      setEdits({ logo: null, banner: null });
      setSaved(next);
      setStoreType(next.storeType);
      setServiceCategory(next.serviceCategory);
      setDescription(next.description);
      onSaved?.(next);
      toast({ title: t("saved") });
    } catch {
      setErrors({ form: t("saveFailed") });
    } finally {
      setSaving(false);
    }
  };

  const bannerSrc = shownImage("banner");
  const logoSrc = shownImage("logo");
  const initials = shop.shopName?.slice(0, 2)?.toUpperCase() || "SH";
  const isPublic = !!shop.slug && !!shop.isApproved && !!shop.isActive;

  const imageField = (kind: StorefrontImageKind) => {
    const edit = edits[kind];
    const hasImage = shownImage(kind) !== null;
    const inputId = `storefront-${kind}`;
    return (
      <div key={kind} className="space-y-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          {t(kind === "logo" ? "logoLabel" : "bannerLabel")}
        </label>
        <p className="text-muted-foreground text-xs">
          {t(kind === "logo" ? "logoHint" : "bannerHint", {
            maxMb: megabytes(STOREFRONT_IMAGE_MAX_BYTES[kind]),
          })}
        </p>
        <input
          id={inputId}
          ref={(el) => {
            fileInputs.current[kind] = el;
          }}
          type="file"
          accept={STOREFRONT_IMAGE_ACCEPT}
          onChange={(e) => handleFileChosen(kind, e)}
          disabled={saving}
          className="sr-only"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputs.current[kind]?.click()}
            disabled={saving}
          >
            <ImagePlus className="h-4 w-4" />
            {hasImage ? t("replaceImage") : t("chooseImage")}
          </Button>
          {hasImage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEdit(kind, saved[SAVED_FIELD[kind]] ? "remove" : null)}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4" />
              {t("removeImage")}
            </Button>
          )}
          {edit !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEdit(kind, null)}
              disabled={saving}
            >
              <RotateCcw className="h-4 w-4" />
              {t("undoChange")}
            </Button>
          )}
          {edit !== null && (
            <span className="text-xs font-medium text-amber-700">
              {edit === "remove" ? t("removedOnSave") : t("notSavedYet")}
            </span>
          )}
        </div>
        {errors[kind] && (
          <p role="alert" className="text-sm text-red-600">
            {errors[kind]}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Store type — decides which sections the public page shows (lib/shop-store-type.ts) */}
        <div role="radiogroup" aria-labelledby="storefront-store-type-label" className="space-y-2">
          <p id="storefront-store-type-label" className="text-sm font-medium">
            {t("storeTypeLabel")}
          </p>
          <p className="text-muted-foreground text-xs">{t("storeTypeHint")}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {STORE_TYPES.map((type) => (
              <label
                key={type}
                className={`has-[:focus-visible]:ring-ring/50 cursor-pointer rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-[3px] ${
                  storeType === type ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="storefront-store-type"
                  value={type}
                  checked={storeType === type}
                  onChange={() => {
                    setStoreType(type);
                    setErrors((prev) => ({ ...prev, storeType: undefined, form: undefined }));
                  }}
                  disabled={saving}
                  className="sr-only"
                />
                <span className="block text-sm font-semibold">{t(STORE_TYPE_LABEL[type])}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {t(STORE_TYPE_DESCRIPTION[type])}
                </span>
              </label>
            ))}
          </div>
          {/* Choosing Services is allowed even with products on sale; say what it does. */}
          {storeType === "services" && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
            >
              {t("servicesWarning")}
            </p>
          )}
          {errors.storeType && (
            <p role="alert" className="text-sm text-red-600">
              {errors.storeType}
            </p>
          )}
        </div>

        {/* The /services category, for a shop the Services page can list.
            Hidden until an admin has created categories. */}
        {storeType !== "products" && categories.length > 0 && (
          <div className="space-y-2">
            <p id="storefront-service-category-label" className="text-sm font-medium">
              {t("serviceCategoryLabel")}
            </p>
            <p className="text-muted-foreground text-xs">{t("serviceCategoryHint")}</p>
            <Select
              value={serviceCategory ?? NO_CATEGORY}
              onValueChange={(value) => {
                setServiceCategory(value === NO_CATEGORY ? null : value);
                setErrors((prev) => ({ ...prev, serviceCategory: undefined, form: undefined }));
              }}
              disabled={saving}
            >
              <SelectTrigger aria-labelledby="storefront-service-category-label" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>{t("serviceCategoryNone")}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {categoryName(category.name, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!serviceCategory && (
              <p
                role="status"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
              >
                {t("serviceCategoryReminder")}
              </p>
            )}
            {errors.serviceCategory && (
              <p role="alert" className="text-sm text-red-600">
                {errors.serviceCategory}
              </p>
            )}
          </div>
        )}

        {/* Preview — the same arrangement as the header of app/shop/[slug]/page.tsx */}
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("preview")}</p>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
            <div className="h-28 w-full bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100 sm:h-40">
              {bannerSrc && <img src={bannerSrc} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="relative mx-3 -mt-8 mb-3 flex items-end gap-4 rounded-2xl border border-stone-100 bg-white p-4 shadow-sm sm:mx-5">
              <div className="-mt-10 h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-amber-50 shadow-md sm:h-20 sm:w-20">
                {logoSrc ? (
                  <img src={logoSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-bold text-amber-600">
                    {initials}
                  </div>
                )}
              </div>
              <p className="min-w-0 truncate pb-1 text-lg font-bold text-stone-900">
                {shop.shopName}
              </p>
            </div>
          </div>
        </div>

        {KINDS.map(imageField)}

        <div className="space-y-2">
          <label htmlFor="storefront-description" className="text-sm font-medium">
            {t("descriptionLabel")}
          </label>
          <Textarea
            id="storefront-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((prev) => ({ ...prev, description: undefined, form: undefined }));
            }}
            placeholder={t("descriptionPlaceholder")}
            rows={5}
            maxLength={STOREFRONT_DESCRIPTION_MAX_LENGTH}
            disabled={saving}
          />
          <div className="text-muted-foreground flex justify-between gap-4 text-xs">
            <span>{t("descriptionHint")}</span>
            <span className="shrink-0 tabular-nums">
              {t("characterCount", {
                count: description.length,
                max: STOREFRONT_DESCRIPTION_MAX_LENGTH,
              })}
            </span>
          </div>
          {errors.description && (
            <p role="alert" className="text-sm text-red-600">
              {errors.description}
            </p>
          )}
        </div>

        {errors.form && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errors.form}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          {isPublic ? (
            <a
              href={`/shop/${shop.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              {t("viewPublicPage")}
            </a>
          ) : (
            <p className="text-muted-foreground text-xs">{t("notPublicYet")}</p>
          )}
          <Button type="button" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("saving")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {t("save")}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
