import { connectDB } from "@/lib/db";
import { Category } from "@/lib/models/category";
import { Company } from "@/lib/models/company";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await connectDB();

    // Get all companies
    const companies = await Company.find({ isActive: true });
    if (companies.length === 0) {
      return NextResponse.json(
        { error: "No companies found. Please create companies first." },
        { status: 400 }
      );
    }

    const categories = [
      // InstaPeels Categories
      {
        name: "Korean Skin Kits",
        slug: "korean-skin-kits",
        description:
          "Complete Korean skincare routines for radiant, glass skin",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Acne Breakout Kits",
        slug: "acne-breakout-kits",
        description: "Targeted solutions for acne-prone skin",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Superficial Peels",
        slug: "superficial-peels",
        description: "Gentle chemical peels for skin renewal",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Glycolic Glow",
        slug: "glycolic-glow",
        description: "Glycolic acid treatments for glowing skin",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Pigmentation",
        slug: "pigmentation",
        description: "Solutions for dark spots and uneven skin tone",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Acne Control",
        slug: "acne-control",
        description: "Advanced acne treatment products",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Haircare",
        slug: "haircare",
        description: "Professional haircare solutions",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Glycolic Body Wash",
        slug: "glycolic-body-wash",
        description: "Body exfoliation with glycolic acid",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Body Skin",
        slug: "body-skin",
        description: "Complete body skincare solutions",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Body Bar",
        slug: "body-bar",
        description: "Specialized body cleansing bars",
        company: companies.find((c) => c.slug === "instapeels")?._id,
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center",
      },

      // DermaFlay Categories
      {
        name: "Sensitive Skin Care",
        slug: "sensitive-skin-care",
        description: "Gentle formulations for sensitive skin",
        company: companies.find((c) => c.slug === "dermaflay")?._id,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Anti-Aging Solutions",
        slug: "anti-aging-solutions",
        description: "Advanced anti-aging treatments",
        company: companies.find((c) => c.slug === "dermaflay")?._id,
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Hydration Therapy",
        slug: "hydration-therapy",
        description: "Deep hydration for all skin types",
        company: companies.find((c) => c.slug === "dermaflay")?._id,
        image:
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Dermatological Treatments",
        slug: "dermatological-treatments",
        description: "Clinical-grade dermatological products",
        company: companies.find((c) => c.slug === "dermaflay")?._id,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Skin Repair",
        slug: "skin-repair",
        description: "Products for damaged skin recovery",
        company: companies.find((c) => c.slug === "dermaflay")?._id,
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center",
      },

      // Vibrissa Categories
      {
        name: "Natural Cleansers",
        slug: "natural-cleansers",
        description: "Gentle, natural cleansing products",
        company: companies.find((c) => c.slug === "vibrissa")?._id,
        image:
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Organic Moisturizers",
        slug: "organic-moisturizers",
        description: "Pure, organic moisturizing solutions",
        company: companies.find((c) => c.slug === "vibrissa")?._id,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Herbal Treatments",
        slug: "herbal-treatments",
        description: "Traditional herbal skincare remedies",
        company: companies.find((c) => c.slug === "vibrissa")?._id,
        image:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Essential Oils",
        slug: "essential-oils",
        description: "Pure essential oils for skincare",
        company: companies.find((c) => c.slug === "vibrissa")?._id,
        image:
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=400&h=300&fit=crop&crop=center",
      },
      {
        name: "Sustainable Skincare",
        slug: "sustainable-skincare",
        description: "Eco-friendly skincare products",
        company: companies.find((c) => c.slug === "vibrissa")?._id,
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop&crop=center",
      },
    ];

    const createdCategories = [];
    const errors = [];

    for (const categoryData of categories) {
      try {
        // Skip if company not found
        if (!categoryData.company) {
          errors.push(`Company not found for category: ${categoryData.name}`);
          continue;
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({
          slug: categoryData.slug,
          company: categoryData.company,
        });

        if (existingCategory) {
          errors.push(
            `Category ${categoryData.name} already exists for this company`
          );
          continue;
        }

        const category = new Category(categoryData);
        await category.save();
        createdCategories.push(category);
      } catch (error) {
        errors.push(`Failed to create ${categoryData.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Category setup completed",
      created: createdCategories.length,
      errors: errors.length,
      categories: createdCategories,
      errorMessages: errors,
    });
  } catch (error) {
    console.error("Error setting up categories:", error);
    return NextResponse.json(
      { error: "Failed to setup categories" },
      { status: 500 }
    );
  }
}
