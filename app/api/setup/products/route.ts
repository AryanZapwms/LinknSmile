import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { Company } from "@/lib/models/company";
import { Category } from "@/lib/models/category";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await connectDB();

    // Get all companies and categories
    const companies = await Company.find({ isActive: true });
    const categories = await Category.find({ isActive: true }).populate(
      "company"
    );

    if (companies.length === 0) {
      return NextResponse.json(
        { error: "No companies found. Please create companies first." },
        { status: 400 }
      );
    }

    const products = [
      // InstaPeels Products
      {
        name: "m-beta-Acne",
        slug: "m-beta-acne",
        description:
          "Advanced acne treatment with mandelic and beta hydroxy acids for effective blemish control",
        price: 2399,
        discountPrice: 1919,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&crop=center",
        images: [
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center",
        ],
        stock: 50,
        sku: "IP-MB-001",
        ingredients: [
          "Salicylic acid",
          "Mandelic acid",
          "Portulaca Oleracea",
          "D-Panthenol",
          "Alpha Arbutin",
        ],
        benefits: [
          "Reduces acne breakouts",
          "Unclogs pores",
          "Smooths skin texture",
          "Reduces inflammation",
        ],
        usage:
          "Apply a thin layer to clean skin, avoiding eye area. Use once daily, preferably at night.",
        company: companies.find((c: any) => c.slug === "instapeels")?._id,
        category: categories.find(
          (c: any) => c.slug === "acne-control" && c.company?.slug === "instapeels"
        )?._id,
        isActive: true,
      },
      {
        name: "Glycolic Glow Serum",
        slug: "glycolic-glow-serum",
        description:
          "Professional-grade glycolic acid serum for radiant, glowing skin",
        price: 1899,
        discountPrice: 1519,
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center",
        images: [
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&crop=center",
        ],
        stock: 30,
        sku: "IP-GG-002",
        ingredients: [
          "Glycolic Acid",
          "Hyaluronic Acid",
          "Vitamin C",
          "Niacinamide",
        ],
        benefits: [
          "Exfoliates dead skin cells",
          "Improves skin texture",
          "Reduces fine lines",
          "Brightens complexion",
        ],
        usage:
          "Apply 2-3 drops to clean skin, avoiding eye area. Start with every other day.",
        company: companies.find((c: any) => c.slug === "instapeels")?._id,
        category: categories.find(
          (c: any) => c.slug === "glycolic-glow" && c.company?.slug === "instapeels"
        )?._id,
        isActive: true,
      },
      {
        name: "Meta-Pigmentation Cream",
        slug: "meta-pigmentation-cream",
        description:
          "Advanced pigmentation treatment for dark spots and uneven skin tone",
        price: 2199,
        discountPrice: 1759,
        image:
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=400&fit=crop&crop=center",
        images: [
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center",
        ],
        stock: 25,
        sku: "IP-MP-003",
        ingredients: [
          "Alpha Arbutin",
          "Kojic Acid",
          "Vitamin C",
          "Licorice Extract",
        ],
        benefits: [
          "Reduces dark spots",
          "Even skin tone",
          "Brightens complexion",
          "Prevents new pigmentation",
        ],
        usage: "Apply to affected areas twice daily, morning and evening.",
        company: companies.find((c: any) => c.slug === "instapeels")?._id,
        category: categories.find(
          (c: any) => c.slug === "pigmentation" && c.company?.slug === "instapeels"
        )?._id,
        isActive: true,
      },

      // DermaFlay Products
      {
        name: "Gentle Hydrating Cleanser",
        slug: "gentle-hydrating-cleanser",
        description:
          "Ultra-gentle cleanser for sensitive skin with hydrating properties",
        price: 1299,
        discountPrice: 1039,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&crop=center",
        images: [
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center",
        ],
        stock: 40,
        sku: "DF-GH-001",
        ingredients: [
          "Ceramides",
          "Hyaluronic Acid",
          "Chamomile Extract",
          "Aloe Vera",
        ],
        benefits: [
          "Gentle cleansing",
          "Maintains skin barrier",
          "Hydrates skin",
          "Soothes irritation",
        ],
        usage:
          "Massage onto wet skin, then rinse thoroughly with lukewarm water.",
        company: companies.find((c: any) => c.slug === "dermaflay")?._id,
        category: categories.find(
          (c: any) =>
            c.slug === "sensitive-skin-care" && c.company?.slug === "dermaflay"
        )?._id,
        isActive: true,
      },
      {
        name: "Anti-Aging Night Cream",
        slug: "anti-aging-night-cream",
        description:
          "Advanced anti-aging night cream with retinol and peptides",
        price: 2599,
        discountPrice: 2079,
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center",
        images: [
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=400&fit=crop&crop=center",
        ],
        stock: 35,
        sku: "DF-AA-002",
        ingredients: ["Retinol", "Peptides", "Hyaluronic Acid", "Vitamin E"],
        benefits: [
          "Reduces fine lines",
          "Improves skin firmness",
          "Boosts collagen",
          "Repairs skin overnight",
        ],
        usage: "Apply to clean skin before bedtime, avoiding eye area.",
        company: companies.find((c: any) => c.slug === "dermaflay")?._id,
        category: categories.find(
          (c: any) =>
            c.slug === "anti-aging-solutions" && c.company?.slug === "dermaflay"
        )?._id,
        isActive: true,
      },

      // Vibrissa Products
      {
        name: "Natural Rosehip Oil",
        slug: "natural-rosehip-oil",
        description:
          "Pure, cold-pressed rosehip oil for natural skin nourishment",
        price: 899,
        discountPrice: 719,
        image:
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=400&fit=crop&crop=center",
        images: [
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&crop=center",
        ],
        stock: 60,
        sku: "VB-RH-001",
        ingredients: [
          "100% Rosehip Oil",
          "Vitamin A",
          "Vitamin C",
          "Essential Fatty Acids",
        ],
        benefits: [
          "Moisturizes skin",
          "Reduces scars",
          "Anti-aging properties",
          "Natural glow",
        ],
        usage: "Apply 2-3 drops to clean skin, gently massage until absorbed.",
        company: companies.find((c: any) => c.slug === "vibrissa")?._id,
        category: categories.find(
          (c: any) => c.slug === "essential-oils" && c.company?.slug === "vibrissa"
        )?._id,
        isActive: true,
      },
      {
        name: "Organic Green Tea Cleanser",
        slug: "organic-green-tea-cleanser",
        description:
          "Gentle organic cleanser with antioxidant-rich green tea extract",
        price: 1199,
        discountPrice: 959,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&crop=center",
        images: [
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&crop=center",
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&crop=center",
        ],
        stock: 45,
        sku: "VB-GT-002",
        ingredients: [
          "Organic Green Tea",
          "Aloe Vera",
          "Chamomile",
          "Natural Surfactants",
        ],
        benefits: [
          "Antioxidant protection",
          "Gentle cleansing",
          "Soothes skin",
          "Natural ingredients",
        ],
        usage: "Wet face, massage cleanser, then rinse with lukewarm water.",
        company: companies.find((c: any) => c.slug === "vibrissa")?._id,
        category: categories.find(
          (c: any) => c.slug === "natural-cleansers" && c.company?.slug === "vibrissa"
        )?._id,
        isActive: true,
      },
    ];

    const createdProducts = [];
    const errors = [];

    for (const productData of products) {
      try {
        // Skip if company or category not found
        if (!productData.company || !productData.category) {
          errors.push(
            `Company or category not found for product: ${productData.name}`
          );
          continue;
        }

        // Check if product already exists
        const existingProduct = await Product.findOne({
          slug: productData.slug,
          company: productData.company,
        });

        if (existingProduct) {
          errors.push(
            `Product ${productData.name} already exists for this company`
          );
          continue;
        }

        const product = new Product(productData);
        await product.save();
        createdProducts.push(product);
      } catch (error: any) {
        errors.push(`Failed to create ${productData.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Product setup completed",
      created: createdProducts.length,
      errors: errors.length,
      products: createdProducts,
      errorMessages: errors,
    });
  } catch (error) {
    console.error("Error setting up products:", error);
    return NextResponse.json(
      { error: "Failed to setup products" },
      { status: 500 }
    );
  }
}
