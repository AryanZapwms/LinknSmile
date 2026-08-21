// app/api/vendor/products/bulk-upload/route.ts
import { withCORS } from "@/lib/cors";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Category } from "@/lib/models/category";
import { getShopSubscriptionAccessState } from "@/lib/vendor-subscription-status";
import Papa from "papaparse";

const VALID_ORIGINS = ["made-in-india", "foreign-made", "unspecified"] as const;
const MAX_ROWS = 500;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const REQUIRED_HEADERS = ["name", "price", "category"];

async function getShopIdForUser(userId: string, sessionShopId?: string) {
  await connectDB();
  const Shop = (await import("@/lib/models/shop")).default;
  if (sessionShopId) return sessionShopId;
  const shop = await Shop.findOne({ ownerId: userId });
  return (shop?._id as any)?.toString();
}

interface RowFailure {
  row: number;
  error: string;
}

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: NextRequest) {
  if (req.method === "OPTIONS") return withCORS(new NextResponse(null));

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return withCORS(NextResponse.json({ message: "Unauthorized" }, { status: 401 }));
    }
    if (session.user.role !== "shop_owner") {
      return withCORS(
        NextResponse.json({ message: "Unauthorized - not a shop owner" }, { status: 401 })
      );
    }

    await connectDB();
    const Shop = (await import("@/lib/models/shop")).default;
    const shopId = await getShopIdForUser(session.user.id, session.user.shopId ?? undefined);
    if (!shopId) {
      return withCORS(
        NextResponse.json(
          { message: "Shop ID not found. Please complete vendor setup." },
          { status: 401 }
        )
      );
    }

    const shop = await Shop.findById(shopId);
    if (!shop || !shop.isApproved) {
      return withCORS(
        NextResponse.json(
          {
            message:
              "Your shop is pending approval. You can only add products after your shop is approved.",
          },
          { status: 403 }
        )
      );
    }

    const access = await getShopSubscriptionAccessState(shopId);
    if (access.isBlocked) {
      return withCORS(
        NextResponse.json(
          { message: "Your subscription has expired. Renew it to add or edit products." },
          { status: 403 }
        )
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return withCORS(NextResponse.json({ message: "No CSV file provided" }, { status: 400 }));
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return withCORS(
        NextResponse.json({ message: "File must be a .csv file" }, { status: 400 })
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return withCORS(
        NextResponse.json({ message: "CSV file is too large (max 2MB)" }, { status: 400 })
      );
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    const fields = parsed.meta.fields || [];
    const missingHeaders = REQUIRED_HEADERS.filter((h) => !fields.includes(h));
    if (missingHeaders.length > 0) {
      return withCORS(
        NextResponse.json(
          { message: `CSV is missing required column(s): ${missingHeaders.join(", ")}` },
          { status: 400 }
        )
      );
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return withCORS(NextResponse.json({ message: "CSV file has no data rows" }, { status: 400 }));
    }
    if (rows.length > MAX_ROWS) {
      return withCORS(
        NextResponse.json(
          { message: `CSV has ${rows.length} rows, which exceeds the ${MAX_ROWS}-row limit per upload` },
          { status: 400 }
        )
      );
    }

    const categories = await Category.find({}).lean();
    const categoryBySlug = new Map<string, string>();
    const categoryByName = new Map<string, string>();
    for (const cat of categories as any[]) {
      categoryBySlug.set(String(cat.slug).toLowerCase(), cat._id.toString());
      categoryByName.set(String(cat.name).toLowerCase(), cat._id.toString());
    }

    const failures: RowFailure[] = [];
    const seenSlugs = new Map<string, number>(); // slug -> first row that claimed it
    const candidates: { rowNumber: number; slug: string; doc: Record<string, any> }[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // header is row 1
      const errors: string[] = [];

      const name = (row.name || "").trim();
      if (!name) errors.push("Name is required");

      const priceRaw = (row.price || "").trim();
      const price = parseFloat(priceRaw);
      if (!priceRaw || !Number.isFinite(price) || price <= 0) {
        errors.push("Price must be a positive number");
      }

      let discountPrice: number | undefined;
      const discountPriceRaw = (row.discountprice || "").trim();
      if (discountPriceRaw) {
        discountPrice = parseFloat(discountPriceRaw);
        if (!Number.isFinite(discountPrice) || discountPrice < 0) {
          errors.push("Discount price must be a non-negative number");
        }
      }

      let stock = 0;
      const stockRaw = (row.stock || "").trim();
      if (stockRaw) {
        stock = Number(stockRaw);
        if (!Number.isInteger(stock) || stock < 0) {
          errors.push("Stock must be a non-negative whole number");
        }
      }

      const categoryRaw = (row.category || "").trim();
      let categoryId: string | undefined;
      if (!categoryRaw) {
        errors.push("Category is required");
      } else {
        categoryId =
          categoryBySlug.get(categoryRaw.toLowerCase()) ||
          categoryByName.get(categoryRaw.toLowerCase());
        if (!categoryId) {
          errors.push(`Category not found: "${categoryRaw}"`);
        }
      }

      const origin = VALID_ORIGINS.includes(row.origin?.trim() as any)
        ? (row.origin!.trim() as (typeof VALID_ORIGINS)[number])
        : "unspecified";

      const images = (row.images || "")
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);

      let slug = "";
      if (name) {
        slug = generateSlug(name);
        if (!slug) {
          errors.push("Name does not produce a valid slug");
        } else if (seenSlugs.has(slug)) {
          errors.push(`Duplicate product slug also used by row ${seenSlugs.get(slug)}`);
        }
      }

      if (errors.length > 0) {
        failures.push({ row: rowNumber, error: errors.join("; ") });
        return;
      }

      seenSlugs.set(slug, rowNumber);
      candidates.push({
        rowNumber,
        slug,
        doc: {
          name,
          slug,
          description: (row.description || "").trim() || undefined,
          price,
          discountPrice,
          image: images[0],
          images,
          category: categoryId,
          shopId,
          stock,
          sku: (row.sku || "").trim() || undefined,
          origin,
          approvalStatus: "pending",
          submittedAt: new Date(),
          isActive: false,
        },
      });
    });

    if (candidates.length > 0) {
      const existing = await Product.find({ slug: { $in: candidates.map((c) => c.slug) } })
        .select("slug")
        .lean();
      const takenSlugs = new Set((existing as any[]).map((p) => p.slug));

      for (const candidate of candidates.slice()) {
        if (takenSlugs.has(candidate.slug)) {
          failures.push({
            row: candidate.rowNumber,
            error: "A product with this slug already exists",
          });
          candidates.splice(candidates.indexOf(candidate), 1);
        }
      }
    }

    const createdProductIds: string[] = [];
    for (const candidate of candidates) {
      try {
        const product = await Product.create(candidate.doc);
        createdProductIds.push(product._id.toString());
      } catch (error: any) {
        failures.push({
          row: candidate.rowNumber,
          error: error.message || "Failed to create product",
        });
      }
    }

    failures.sort((a, b) => a.row - b.row);

    return withCORS(
      NextResponse.json({
        success: true,
        totalRows: rows.length,
        successCount: createdProductIds.length,
        failedCount: failures.length,
        failures,
        createdProductIds,
      })
    );
  } catch (error: any) {
    console.error("Bulk product upload error:", error);
    return withCORS(
      NextResponse.json(
        { message: "Failed to process bulk upload", error: error.message },
        { status: 500 }
      )
    );
  }
}
