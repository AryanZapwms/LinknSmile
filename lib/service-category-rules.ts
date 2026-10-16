// lib/service-category-rules.ts
//
// Rules for service categories (lib/models/service-category.ts), the list
// the /services page filters by. Kept free of server-only imports: the admin
// Services page and the Store Page form use the same rules in the browser.

/** The languages a category name can be given in. English is required. */
export const SERVICE_CATEGORY_LOCALES = ["en", "ar", "hi"] as const;
export type ServiceCategoryLocale = (typeof SERVICE_CATEGORY_LOCALES)[number];

export type ServiceCategoryName = { en: string; ar?: string; hi?: string };

export const SERVICE_CATEGORY_NAME_MAX_LENGTH = 60;

/**
 * The categories the admin Services page offers to add, once, when a
 * country's list is empty ("Add starting categories"). After that they are
 * ordinary data the admin can rename, reorder or remove; nothing reads this
 * list again.
 */
export const STARTING_SERVICE_CATEGORIES: ServiceCategoryName[] = [
  { en: "Photography", ar: "التصوير", hi: "फ़ोटोग्राफ़ी" },
  { en: "Design", ar: "التصميم", hi: "डिज़ाइन" },
  { en: "Tutoring", ar: "الدروس الخصوصية", hi: "ट्यूशन" },
  { en: "Consulting", ar: "الاستشارات", hi: "परामर्श" },
  { en: "Events", ar: "الفعاليات", hi: "इवेंट्स" },
  { en: "Beauty & Wellness", ar: "الجمال والعناية", hi: "सौंदर्य और वेलनेस" },
  { en: "Repairs", ar: "الإصلاحات", hi: "मरम्मत" },
  { en: "Other", ar: "أخرى", hi: "अन्य" },
];

/** The name to show in a language, falling back to English when it has none. */
export function categoryName(name: Partial<ServiceCategoryName> | undefined, locale: string): string {
  const own = name?.[locale as ServiceCategoryLocale]?.trim();
  return own || name?.en?.trim() || "";
}

/** A URL-safe slug from an English name: "Beauty & Wellness" -> "beauty-wellness". */
export function slugifyCategory(en: string): string {
  return (
    en
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "category"
  );
}
