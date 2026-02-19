import { connectDB } from "@/lib/db";
import { Company } from "@/lib/models/company";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await connectDB();

    const brands = [
      {
        name: "InstaPeels",
        slug: "instapeels",
        description:
          "Professional peeling solutions for advanced skincare. InstaPeels offers clinical-grade chemical peels and professional treatments designed for dermatologists and skincare professionals. Our products deliver instant, visible results with proven formulations.",
        logo: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
        banner:
          "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=400&fit=crop&crop=center",
        email: "contact@instapeels.com",
        phone: "+1 (555) 123-4567",
        website: "https://instapeels.com",
        isActive: true,
      },
      {
        name: "DermaFlay",
        slug: "dermaflay",
        description:
          "Advanced dermatological care for sensitive skin. DermaFlay specializes in gentle yet effective skincare solutions for sensitive and problematic skin. Our products are formulated with dermatologist-recommended ingredients for optimal skin health.",
        logo: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
        banner:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&h=400&fit=crop&crop=center",
        email: "info@dermaflay.com",
        phone: "+1 (555) 234-5678",
        website: "https://dermaflay.com",
        isActive: true,
      },
      {
        name: "Vibrissa",
        slug: "vibrissa",
        description:
          "Natural skincare essentials for everyday beauty. Vibrissa combines nature's best ingredients with modern skincare science to create gentle, effective products for daily use. Our formulations are clean, sustainable, and perfect for all skin types.",
        logo: "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=200&h=200&fit=crop&crop=center",
        banner:
          "https://images.unsplash.com/photo-1599305445771-384c3243a9d2?w=1200&h=400&fit=crop&crop=center",
        email: "hello@vibrissa.com",
        phone: "+1 (555) 345-6789",
        website: "https://vibrissa.com",
        isActive: true,
      },
    ];

    const createdBrands = [];
    const errors = [];

    for (const brandData of brands) {
      try {
        // Check if brand already exists
        const existingBrand = await Company.findOne({ slug: brandData.slug });
        if (existingBrand) {
          errors.push(`Brand ${brandData.name} already exists`);
          continue;
        }

        const brand = new Company(brandData);
        await brand.save();
        createdBrands.push(brand);
      } catch (error) {
        errors.push(`Failed to create ${brandData.name}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Brand setup completed",
      created: createdBrands.length,
      errors: errors.length,
      brands: createdBrands,
      errorMessages: errors,
    });
  } catch (error) {
    console.error("Error setting up brands:", error);
    return NextResponse.json(
      { error: "Failed to setup brands" },
      { status: 500 }
    );
  }
}
