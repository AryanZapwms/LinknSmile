// components/country-switch-bar.tsx
import { getTranslations } from "next-intl/server";
import { IS_INDIA, OTHER_COUNTRY_SITE_URL } from "@/lib/site-config";

export async function CountrySwitchBar() {
  if (!OTHER_COUNTRY_SITE_URL) return null;

  const t = await getTranslations("Header.countrySwitch");

  return (
    <div className={IS_INDIA ? "bg-amber-50 text-amber-800" : "bg-gold-50 text-gold-700"}>
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium sm:text-sm">
        <span>{IS_INDIA ? t("toUae") : t("toIndia")}</span>
        <a
          href={OTHER_COUNTRY_SITE_URL}
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          {t("cta")}
        </a>
      </div>
    </div>
  );
}
