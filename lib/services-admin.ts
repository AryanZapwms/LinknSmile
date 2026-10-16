// lib/services-admin.ts
//
// What an admin manages for the /services page, from /admin/services
// (app/api/admin/services): the navbar switch, the service categories and
// the featured vendors. Every change is written to AuditLog in the same
// transaction as the change itself, so there is never one without the other.
// The public side is lib/services-page.ts.

import mongoose from "mongoose";
import { ServiceCategory } from "@/lib/models/service-category";
import Shop from "@/lib/models/shop";
import { PlatformSettings } from "@/lib/models/platform-settings";
import { AuditLog } from "@/lib/models/audit-log";
import type { ErrorCode } from "@/lib/contracts/errors";
import { shopsHiddenBySubscription } from "@/lib/storefront-visibility";
import { storeTypeOf } from "@/lib/shop-store-type";
import {
  SERVICE_CATEGORY_LOCALES,
  SERVICE_CATEGORY_NAME_MAX_LENGTH,
  STARTING_SERVICE_CATEGORIES,
  slugifyCategory,
  type ServiceCategoryName,
} from "@/lib/service-category-rules";

export type ServicesErrorReason =
  | "NAME_REQUIRED"
  | "NAME_TOO_LONG"
  | "NAME_TAKEN"
  | "ORDER"
  | "NOT_EMPTY"
  | "SHOPS"
  | "ENABLED";

export interface ServicesFailure {
  ok: false;
  status: number;
  code: ErrorCode;
  message: string;
  reason?: ServicesErrorReason;
  field?: string;
  /** SHOPS: the ids that cannot be featured. */
  invalidIds?: string[];
}

export interface AdminActor {
  id: string;
  ip: string;
}

export interface AdminServiceCategory {
  _id: string;
  name: { en: string; ar: string; hi: string };
  slug: string;
  sortOrder: number;
  /** Shops that have this category, whatever their state. */
  vendorCount: number;
}

/** Why a shop is not on /services right now, or null when it is. */
export type NotShownReason = "missing" | "not_services" | "not_approved" | "inactive" | "subscription";

export interface AdminServicesVendor {
  _id: string;
  shopName: string;
  slug: string;
  logo: string | null;
  city: string | null;
  serviceCategory: string | null;
  notShown: NotShownReason | null;
}

export interface AdminServicesOverview {
  navEnabled: boolean;
  categories: AdminServiceCategory[];
  /** In display order. A shop deleted since it was featured has notShown "missing". */
  featured: AdminServicesVendor[];
  /** Approved shops with store type Services or Both: the ones that can be featured. */
  vendors: AdminServicesVendor[];
}

const notFound = (message: string): ServicesFailure => ({
  ok: false,
  status: 404,
  code: "NOT_FOUND",
  message,
});

const invalid = (reason: ServicesErrorReason, message: string, field?: string): ServicesFailure => ({
  ok: false,
  status: 400,
  code: "VALIDATION_ERROR",
  message,
  reason,
  field,
});

/** Runs fn in a transaction; changes and their audit entries commit together. */
async function inTransaction<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

const audit = (
  session: mongoose.ClientSession,
  admin: AdminActor,
  entry: { action: string; targetEntity: string; targetId?: unknown; before?: unknown; after?: unknown; metadata?: unknown }
) =>
  AuditLog.create([{ ...entry, performedBy: admin.id, ipAddress: admin.ip }], { session });

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toCategory(doc: any, vendorCount = 0): AdminServiceCategory {
  return {
    _id: String(doc._id),
    name: { en: doc.name?.en ?? "", ar: doc.name?.ar ?? "", hi: doc.name?.hi ?? "" },
    slug: doc.slug,
    sortOrder: doc.sortOrder ?? 0,
    vendorCount,
  };
}

/** Checks a { en, ar?, hi? } name: English required, each one 60 characters at most. */
function readName(raw: unknown): { ok: true; name: Required<ServiceCategoryName> } | ServicesFailure {
  const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const name = { en: "", ar: "", hi: "" };
  for (const locale of SERVICE_CATEGORY_LOCALES) {
    const value = typeof input[locale] === "string" ? (input[locale] as string).trim() : "";
    if (value.length > SERVICE_CATEGORY_NAME_MAX_LENGTH) {
      return invalid(
        "NAME_TOO_LONG",
        `A name can be at most ${SERVICE_CATEGORY_NAME_MAX_LENGTH} characters`,
        `name.${locale}`
      );
    }
    name[locale] = value;
  }
  if (!name.en) return invalid("NAME_REQUIRED", "An English name is required", "name.en");
  return { ok: true, name };
}

/** No two categories may share an English name (ignoring case). */
async function englishNameTaken(en: string, exceptId?: string) {
  return ServiceCategory.exists({
    "name.en": { $regex: `^${escapeRegex(en)}$`, $options: "i" },
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  });
}

async function uniqueSlug(en: string, session?: mongoose.ClientSession) {
  const base = slugifyCategory(en);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await ServiceCategory.exists({ slug }).session(session ?? null))) return slug;
  }
}

async function readSettings(session?: mongoose.ClientSession) {
  const settings = await PlatformSettings.findOne()
    .select("servicesNavEnabled servicesFeaturedShops")
    .session(session ?? null)
    .lean<{ servicesNavEnabled?: boolean; servicesFeaturedShops?: unknown[] }>();
  return {
    navEnabled: !!settings?.servicesNavEnabled,
    featured: (settings?.servicesFeaturedShops ?? []).map(String),
  };
}

/** Whether the navbar link and the /services page are switched on. */
export async function isServicesEnabled(): Promise<boolean> {
  return (await readSettings()).navEnabled;
}

export async function getServicesOverview(now: Date = new Date()): Promise<AdminServicesOverview> {
  const [settings, categories, counts] = await Promise.all([
    readSettings(),
    ServiceCategory.find().sort({ sortOrder: 1, createdAt: 1 }).lean(),
    Shop.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { serviceCategory: { $ne: null } } },
      { $group: { _id: "$serviceCategory", count: { $sum: 1 } } },
    ]),
  ]);
  const countOf = new Map(counts.map((c) => [String(c._id), c.count]));

  // Every shop the page could involve: the candidates plus whatever is featured.
  const shops = await Shop.find({
    $or: [
      { isApproved: true, storeType: { $in: ["services", "both"] } },
      { _id: { $in: settings.featured } },
    ],
  })
    .select("shopName slug logo address.city serviceCategory storeType isApproved isActive")
    .sort({ shopName: 1 })
    .lean<any[]>();
  const hidden = await shopsHiddenBySubscription(
    shops.map((s) => s._id),
    now
  );

  const toVendor = (shop: any): AdminServicesVendor => ({
    _id: String(shop._id),
    shopName: shop.shopName,
    slug: shop.slug,
    logo: shop.logo ?? null,
    city: shop.address?.city ?? null,
    serviceCategory: shop.serviceCategory ? String(shop.serviceCategory) : null,
    notShown:
      storeTypeOf(shop) === "products"
        ? "not_services"
        : !shop.isApproved
          ? "not_approved"
          : shop.isActive === false
            ? "inactive"
            : hidden.has(String(shop._id))
              ? "subscription"
              : null,
  });
  const byId = new Map(shops.map((shop) => [String(shop._id), shop]));

  return {
    navEnabled: settings.navEnabled,
    categories: categories.map((c) => toCategory(c, countOf.get(String(c._id)) ?? 0)),
    featured: settings.featured.map((id) => {
      const shop = byId.get(id);
      return shop
        ? toVendor(shop)
        : { _id: id, shopName: "", slug: "", logo: null, city: null, serviceCategory: null, notShown: "missing" as const };
    }),
    vendors: shops.filter((s) => s.isApproved && storeTypeOf(s) !== "products").map(toVendor),
  };
}

export async function setServicesNavEnabled(
  input: { enabled?: unknown },
  admin: AdminActor
): Promise<{ ok: true; navEnabled: boolean } | ServicesFailure> {
  if (typeof input.enabled !== "boolean") {
    return invalid("ENABLED", "enabled must be true or false", "enabled");
  }
  const enabled = input.enabled;
  return inTransaction(async (session) => {
    const before = await readSettings(session);
    if (before.navEnabled === enabled) return { ok: true, navEnabled: enabled };
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { $set: { servicesNavEnabled: enabled } },
      { upsert: true, new: true, session }
    );
    await audit(session, admin, {
      action: "SERVICES_NAV_SWITCHED",
      targetEntity: "PlatformSettings",
      targetId: settings._id,
      before: { servicesNavEnabled: before.navEnabled },
      after: { servicesNavEnabled: enabled },
    });
    return { ok: true, navEnabled: enabled };
  });
}

/**
 * Replaces the featured list (ids in display order). A shop added to it
 * must be an approved shop with store type Services or Both; one already on
 * it may stay whatever has happened to it since, so the admin can always
 * reorder or remove.
 */
export async function setFeaturedShops(
  input: { shopIds?: unknown },
  admin: AdminActor
): Promise<{ ok: true; featured: string[] } | ServicesFailure> {
  const ids = input.shopIds;
  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === "string" && mongoose.isValidObjectId(id)) ||
    new Set(ids).size !== ids.length
  ) {
    return invalid("SHOPS", "shopIds must be a list of shop ids, each once", "shopIds");
  }

  return inTransaction(async (session) => {
    const before = await readSettings(session);
    const added = (ids as string[]).filter((id) => !before.featured.includes(id));
    if (added.length > 0) {
      const ok = await Shop.find({
        _id: { $in: added },
        isApproved: true,
        storeType: { $in: ["services", "both"] },
      })
        .select("_id")
        .session(session)
        .lean();
      const okIds = new Set(ok.map((s) => String(s._id)));
      const invalidIds = added.filter((id) => !okIds.has(id));
      if (invalidIds.length > 0) {
        return {
          ...invalid("SHOPS", "Only approved Services or Both shops can be featured", "shopIds"),
          invalidIds,
        };
      }
    }

    const after = ids as string[];
    if (after.join() === before.featured.join()) return { ok: true, featured: after };
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { $set: { servicesFeaturedShops: after.map((id) => new mongoose.Types.ObjectId(id)) } },
      { upsert: true, new: true, session }
    );
    await audit(session, admin, {
      action: "SERVICES_FEATURED_UPDATED",
      targetEntity: "PlatformSettings",
      targetId: settings._id,
      before: { servicesFeaturedShops: before.featured },
      after: { servicesFeaturedShops: after },
    });
    return { ok: true, featured: after };
  });
}

export async function createServiceCategory(
  input: { name?: unknown },
  admin: AdminActor
): Promise<{ ok: true; category: AdminServiceCategory } | ServicesFailure> {
  const read = readName(input.name);
  if (!read.ok) return read;
  if (await englishNameTaken(read.name.en)) {
    return { ...invalid("NAME_TAKEN", "A category with this English name already exists", "name.en"), status: 409 };
  }

  return inTransaction(async (session) => {
    const last = await ServiceCategory.findOne().sort({ sortOrder: -1 }).session(session).lean();
    const [category] = await ServiceCategory.create(
      [{ name: read.name, slug: await uniqueSlug(read.name.en, session), sortOrder: (last?.sortOrder ?? -1) + 1 }],
      { session }
    );
    await audit(session, admin, {
      action: "SERVICE_CATEGORY_CREATED",
      targetEntity: "ServiceCategory",
      targetId: category._id,
      after: { name: read.name, slug: category.slug },
    });
    return { ok: true, category: toCategory(category.toObject()) };
  });
}

/** Changes the names. The slug stays, so existing /services?category= links keep working. */
export async function renameServiceCategory(
  id: string,
  input: { name?: unknown },
  admin: AdminActor
): Promise<{ ok: true; category: AdminServiceCategory } | ServicesFailure> {
  if (!mongoose.isValidObjectId(id)) return notFound("Category not found");
  const read = readName(input.name);
  if (!read.ok) return read;
  if (await englishNameTaken(read.name.en, id)) {
    return { ...invalid("NAME_TAKEN", "A category with this English name already exists", "name.en"), status: 409 };
  }

  return inTransaction(async (session) => {
    const before = await ServiceCategory.findById(id).session(session).lean();
    if (!before) return notFound("Category not found");
    const after = await ServiceCategory.findByIdAndUpdate(
      id,
      { $set: { name: read.name } },
      { new: true, runValidators: true, session }
    ).lean();
    const vendorCount = await Shop.countDocuments({ serviceCategory: id }).session(session);
    if (JSON.stringify(toCategory(before).name) !== JSON.stringify(read.name)) {
      await audit(session, admin, {
        action: "SERVICE_CATEGORY_RENAMED",
        targetEntity: "ServiceCategory",
        targetId: before._id,
        before: { name: toCategory(before).name },
        after: { name: read.name },
      });
    }
    return { ok: true, category: toCategory(after, vendorCount) };
  });
}

/** Sets the display order. `order` must list every category id exactly once. */
export async function reorderServiceCategories(
  input: { order?: unknown },
  admin: AdminActor
): Promise<{ ok: true; order: string[] } | ServicesFailure> {
  const order = input.order;
  if (!Array.isArray(order) || !order.every((id) => typeof id === "string")) {
    return invalid("ORDER", "order must be a list of category ids", "order");
  }

  return inTransaction(async (session) => {
    const all = await ServiceCategory.find().sort({ sortOrder: 1, createdAt: 1 }).select("_id").session(session).lean();
    const before = all.map((c) => String(c._id));
    if (order.length !== before.length || new Set(order).size !== order.length || !order.every((id) => before.includes(id))) {
      return invalid("ORDER", "order must list every category exactly once", "order");
    }
    if (order.join() === before.join()) return { ok: true, order: before };
    await ServiceCategory.bulkWrite(
      order.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } } })),
      { session }
    );
    await audit(session, admin, {
      action: "SERVICE_CATEGORIES_REORDERED",
      targetEntity: "ServiceCategory",
      before: { order: before },
      after: { order },
    });
    return { ok: true, order: order as string[] };
  });
}

/** Deletes a category; the shops that had it are left without one. */
export async function removeServiceCategory(
  id: string,
  admin: AdminActor
): Promise<{ ok: true; vendorsAffected: number } | ServicesFailure> {
  if (!mongoose.isValidObjectId(id)) return notFound("Category not found");

  return inTransaction(async (session) => {
    const category = await ServiceCategory.findById(id).session(session).lean();
    if (!category) return notFound("Category not found");
    const { modifiedCount } = await Shop.updateMany(
      { serviceCategory: category._id },
      { $set: { serviceCategory: null } },
      { session }
    );
    await ServiceCategory.deleteOne({ _id: category._id }, { session });
    await audit(session, admin, {
      action: "SERVICE_CATEGORY_REMOVED",
      targetEntity: "ServiceCategory",
      targetId: category._id,
      before: { name: toCategory(category).name, slug: category.slug },
      metadata: { vendorsAffected: modifiedCount },
    });
    return { ok: true, vendorsAffected: modifiedCount };
  });
}

/** Adds the starting categories to an empty list ("Add starting categories"). */
export async function addStartingServiceCategories(
  admin: AdminActor
): Promise<{ ok: true; categories: AdminServiceCategory[] } | ServicesFailure> {
  return inTransaction(async (session) => {
    if ((await ServiceCategory.countDocuments().session(session)) > 0) {
      return {
        ...invalid("NOT_EMPTY", "Starting categories can only be added while the list is empty"),
        status: 409,
      };
    }
    const created = await ServiceCategory.insertMany(
      STARTING_SERVICE_CATEGORIES.map((name, index) => ({
        name: { en: name.en, ar: name.ar ?? "", hi: name.hi ?? "" },
        slug: slugifyCategory(name.en),
        sortOrder: index,
      })),
      { session }
    );
    await audit(session, admin, {
      action: "SERVICE_CATEGORIES_STARTING_ADDED",
      targetEntity: "ServiceCategory",
      after: { slugs: created.map((c) => c.slug) },
    });
    return { ok: true, categories: created.map((c) => toCategory(c.toObject())) };
  });
}
