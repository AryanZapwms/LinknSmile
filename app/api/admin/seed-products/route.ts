// app/api/admin/seed-products/route.ts
// ONE-TIME seed route. Hit GET /api/admin/seed-products?secret=seed-now-2024
// Delete this file after running.

import { withCORS } from "@/lib/cors";
import { connectDB } from "@/lib/db";
import { Product } from "@/lib/models/product";
import { NextRequest, NextResponse } from "next/server";

const SEED_SECRET = process.env.MIGRATION_SECRET || "migrate-now-2024";

const CATEGORIES = {
  "sustainable-shopping":    "69ae7001535bc9abecb6bb31",
  "organic-products-online": "69ae7001535bc9abecb6bb28",
  "organic-food-online":     "69ae7001535bc9abecb6bb2d",
  "chemical-free-products":  "69ae7001535bc9abecb6bb30",
  "artisan-products":        "69ae7001535bc9abecb6bb2f",
  "eco-friendly-products":   "69ae7001535bc9abecb6bb2c",
  "natural-products":        "69ae7001535bc9abecb6bb2b",
  "handmade-crafts":         "69ae7001535bc9abecb6bb2e",
  "handmade-products":       "69ae7001535bc9abecb6bb29",
};

const SHOPS = {
  bhavya: "69a7e51a8967d5c3d9e8961d",
  varun:  "6996a7fdfdcbb4173e7f46cd",
  mihir:  "6996dde8fdcbb4173e7f4a10",
};

const IMG = {
  tote:        "https://sumaavi.in/cdn/shop/products/Handpainted-balloon-tote-bag-Floral-design.webp?v=1676279955",
  bamboo:      "https://techbullion.com/wp-content/uploads/2022/07/Bamboo-Products-Market-1.jpg",
  seedKit:     "https://dujjhct8zer0r.cloudfront.net/media/prod_image/4069771791755924794.webp",
  orgSerum:    "https://www.rawskincareshop.com/cdn/shop/files/gps_generated_e98d3834-c4f1-4803-9739-1aed963f4d3a_345x@2x.png?v=1730234328",
  orgFace:     "https://hollywoodtimessquare.com/wp-content/uploads/2013/10/orgface-620x400.jpg",
  herbShampoo: "https://media6.ppl-media.com/tr:h-750,w-750,c-at_max,dpr-2,q-40/static/img/product/404171/vedic-valley-21-tatva-brewed-herb-shampoo-300-ml_1_display_1756191007_6bedb8e6.jpg",
  honey:       "https://cdn11.bigcommerce.com/s-5h8rqg02f8/images/stencil/650w/products/1059/11198/FOP___08209.1739357876.jpg",
  spices:      "https://insights.ehl.edu/hs-fs/hubfs/1440/1440x960-spices.jpg?width=700&height=462&name=1440x960-spices.jpg",
  tea:         "https://www.teaforturmeric.com/wp-content/uploads/2021/11/Masala-Chai-Tea-Recipe-Card.jpg   ",
  ghee:        "https://d10i8ghbmk7qrh.cloudfront.net/images/product/67dbcfc5d10591742458822.jpeg",
  cleanser:    "https://cdn.shopify.com/s/files/1/0609/6096/4855/files/HYDRATING_CLEANSER-01.jpg?v=1768983451",
  toothpaste:  "https://www.clickoncare.com/cdn/shop/files/glizer-toothpaste_-100gm-9887707564.jpg?v=1683610083",
  deodorant:   "https://cloudinary.images-iherb.com/image/upload/f_auto,q_auto:eco/images/deg/deg15229/y/27.jpg ",
  pottery:     "https://images.squarespace-cdn.com/content/v1/54f86bb8e4b0cabbe1cba53c/5d3f1cb9-fd10-432f-ad53-0e3687f0d381/finished-pieces-2-3072x2048.jpg",
  blockPrint:  "https://www.sootisyahi.com/cdn/shop/articles/the-art-of-sustainable-fabric-design-in-block-print-884167.jpg?v=1660821645&width=2048",
  woodArt:     "https://i.ytimg.com/vi/XqXEX6cdbWY/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLBmqvNNCg1G-jpwuLOyzQjKyQT0tg",
  jute:        "https://www.amar-khamar.com/cdn/shop/files/IMG_1760.jpg?v=1731256997&width=416",
  bambooStraw: "https://www.ethicaonline.com/wp-content/uploads/2021/12/WhatsApp-Image-2021-11-14-at-12.15.13-PM.jpeg",
  soapBar:     "https://m.media-amazon.com/images/S/aplus-media-library-service-media/32920677-0e1b-4847-a2d8-62bcb910335c.__CR0,0,1024,1024_PT0_SX300_V1___.png",
  essOil:      "https://essoil.rw/wp-content/uploads/2025/02/lavender-2.png",
  aloeVera:    "https://cdn.shopify.com/s/files/1/0781/0514/9772/files/Blog-AloeVera-990px_0004_AdobeStock_284886074.jpg?v=1699628817",
  candle:      "https://market99.com/cdn/shop/files/1_3d1e66cd-d93b-4249-9e8e-c26d342db6d1.jpg?v=1750155387",
  macrame:     "https://m.media-amazon.com/images/I/71EN7JSGsiL.jpg",
  jewelry:     "https://fentonand.co/cdn/shop/articles/bridal-jewellery_99d3c119-59f2-46e9-a75a-bd23c39926d7.jpg?v=1651852793",
};

const PRODUCTS = [
  // ── Sustainable Shopping ─────────────────────────────────
  { name: "Organic Cotton Tote Bag", slug: "organic-cotton-tote-bag", description: "100% organic cotton tote bag — durable, washable, and perfect for everyday shopping. Replace plastic bags with this eco-conscious choice.", price: 349, discountPrice: 249, image: IMG.tote, category: CATEGORIES["sustainable-shopping"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 200, benefits: ["Replaces 500+ plastic bags", "Machine washable", "Durable cotton canvas"] },
  { name: "Bamboo Toothbrush Set of 4", slug: "bamboo-toothbrush-set-of-4", description: "Biodegradable bamboo toothbrushes with charcoal-infused bristles. Plastic-free packaging.", price: 299, discountPrice: 199, image: IMG.bamboo, category: CATEGORIES["sustainable-shopping"], shopId: SHOPS.varun, origin: "made-in-india", stock: 150 },
  { name: "Seed Starter Kit — Grow Your Own Herbs", slug: "seed-starter-kit-grow-your-own-herbs", description: "Everything you need to start your kitchen garden. Includes 6 herb seed packets, coco-peat pots, and a growing guide.", price: 599, discountPrice: 449, image: IMG.seedKit, category: CATEGORIES["sustainable-shopping"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 80 },
  { name: "Reusable Beeswax Food Wraps Set of 3", slug: "reusable-beeswax-food-wraps-set-of-3", description: "Natural beeswax wraps to replace cling film. Keeps food fresh, washable, reusable for up to a year.", price: 449, discountPrice: 349, image: IMG.jute, category: CATEGORIES["sustainable-shopping"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 120 },
  { name: "Jute Shopping Bag with Zipper", slug: "jute-shopping-bag-with-zipper", description: "Sturdy jute bag with secure zipper and inner lining. Ideal for groceries or casual outings.", price: 279, discountPrice: 199, image: IMG.jute, category: CATEGORIES["sustainable-shopping"], shopId: SHOPS.varun, origin: "made-in-india", stock: 180 },

  // ── Organic Products Online ──────────────────────────────
  { name: "Organic Vitamin C Face Serum", slug: "organic-vitamin-c-face-serum", description: "Potent 15% Vitamin C serum with cold-pressed rosehip oil. Brightens skin and reduces pigmentation.", price: 899, discountPrice: 649, image: IMG.orgSerum, category: CATEGORIES["organic-products-online"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 90, ingredients: ["Rosehip Oil", "Vitamin C", "Hyaluronic Acid", "Aloe Vera"], benefits: ["Brightens skin", "Reduces dark spots", "Boosts collagen"] },
  { name: "Organic Aloe Vera Face Gel", slug: "organic-aloe-vera-face-gel", description: "Pure 99% organic aloe vera gel — no fragrance, no parabens. Soothes and hydrates skin.", price: 349, discountPrice: 249, image: IMG.aloeVera, category: CATEGORIES["organic-products-online"], shopId: SHOPS.varun, origin: "made-in-india", stock: 200, ingredients: ["Aloe Barbadensis Leaf Extract (99%)"], benefits: ["Soothes sunburn", "Hydrates skin", "Calms redness"] },
  { name: "Herbal Anti-Hairfall Shampoo", slug: "herbal-anti-hairfall-shampoo", description: "Ayurvedic shampoo with bhringraj, amla, and shikakai. Strengthens roots and reduces breakage.", price: 499, discountPrice: 379, image: IMG.herbShampoo, category: CATEGORIES["organic-products-online"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 130, ingredients: ["Bhringraj", "Amla", "Shikakai", "Neem Oil"], benefits: ["Reduces hairfall", "Strengthens roots", "Adds shine"] },
  { name: "Organic Neem and Tulsi Face Wash", slug: "organic-neem-tulsi-face-wash", description: "Gentle foaming face wash with neem and tulsi. Controls acne and deep cleans pores.", price: 299, discountPrice: 219, image: IMG.orgFace, category: CATEGORIES["organic-products-online"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 160, ingredients: ["Neem Extract", "Tulsi Extract", "Tea Tree Oil"], benefits: ["Controls acne", "Deep pore cleansing", "Oil balance"] },

  // ── Organic Food Online ──────────────────────────────────
  { name: "Raw Forest Honey 500g", slug: "raw-forest-honey-500g", description: "Unprocessed raw honey from forest beehives in Uttarakhand. Rich in enzymes and antioxidants.", price: 599, discountPrice: 449, image: IMG.honey, category: CATEGORIES["organic-food-online"], shopId: SHOPS.varun, origin: "made-in-india", stock: 100, benefits: ["Rich in antioxidants", "No added sugar", "Boosts immunity"] },
  { name: "Organic Masala Chai Blend 100g", slug: "organic-masala-chai-blend-100g", description: "Handcrafted blend of organic Assam tea, cardamom, ginger, cinnamon, and cloves.", price: 349, discountPrice: 279, image: IMG.tea, category: CATEGORIES["organic-food-online"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 200, ingredients: ["Organic Assam Tea", "Cardamom", "Ginger", "Cinnamon", "Cloves"] },
  { name: "Cold Pressed Coconut Oil 500ml", slug: "cold-pressed-coconut-oil-500ml", description: "Virgin coconut oil extracted using traditional cold-press. No heat, no chemicals.", price: 449, discountPrice: 349, image: IMG.ghee, category: CATEGORIES["organic-food-online"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 120, benefits: ["High smoke point", "Nourishes hair", "Moisturises skin"] },
  { name: "Organic Turmeric Powder 200g", slug: "organic-turmeric-powder-200g", description: "Single-origin organic turmeric from Erode, Tamil Nadu. High curcumin, no additives.", price: 199, discountPrice: 149, image: IMG.spices, category: CATEGORIES["organic-food-online"], shopId: SHOPS.varun, origin: "made-in-india", stock: 300, benefits: ["High curcumin", "Anti-inflammatory", "Natural colour"] },
  { name: "Mixed Dry Fruits and Nuts Box 500g", slug: "mixed-dry-fruits-nuts-box-500g", description: "Premium mix of almonds, cashews, raisins, pistachios, and walnuts. No salt or sugar.", price: 799, discountPrice: 649, image: IMG.honey, category: CATEGORIES["organic-food-online"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 80, benefits: ["High protein", "Healthy fats", "No preservatives"] },

  // ── Chemical-Free Products ───────────────────────────────
  { name: "Chemical Free Charcoal Face Cleanser", slug: "chemical-free-charcoal-face-cleanser", description: "100% chemical-free cleanser with activated charcoal and kaolin clay. Draws out impurities without stripping natural oils.", price: 399, discountPrice: 299, image: IMG.cleanser, category: CATEGORIES["chemical-free-products"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 110, ingredients: ["Activated Charcoal", "Kaolin Clay", "Tea Tree Oil", "Aloe Vera"], benefits: ["Deep pore cleansing", "No harsh chemicals"] },
  { name: "Natural Fluoride Free Toothpaste", slug: "natural-fluoride-free-toothpaste", description: "Ayurvedic toothpaste with neem, clove, and mint. No fluoride, no SLS, no artificial colours.", price: 249, discountPrice: 179, image: IMG.toothpaste, category: CATEGORIES["chemical-free-products"], shopId: SHOPS.varun, origin: "made-in-india", stock: 220, ingredients: ["Neem Extract", "Clove Oil", "Mint", "Calcium Carbonate"], benefits: ["No fluoride", "Antibacterial", "Fresh breath"] },
  { name: "Aluminium Free Natural Deodorant", slug: "aluminium-free-natural-deodorant", description: "Baking soda and coconut oil deodorant. No aluminium, no parabens. 8–10 hours of freshness.", price: 349, discountPrice: 279, image: IMG.deodorant, category: CATEGORIES["chemical-free-products"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 140, ingredients: ["Baking Soda", "Coconut Oil", "Shea Butter", "Lavender Oil"], benefits: ["No aluminium", "8-10 hour freshness"] },

  // ── Artisan Products ─────────────────────────────────────
  { name: "Handpainted Blue Pottery Mug", slug: "handpainted-blue-pottery-mug", description: "Traditional Jaipur blue pottery mug, hand-painted by local artisans. Food-safe glaze, 250ml.", price: 599, discountPrice: 449, image: IMG.pottery, category: CATEGORIES["artisan-products"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 60, benefits: ["Unique handpainted design", "Food-safe glaze", "Supports local artisans"] },
  { name: "Block Print Cotton Cushion Cover", slug: "block-print-cotton-cushion-cover", description: "Hand block-printed cushion cover from Sanganer, Rajasthan. Natural dyes, 100% cotton, 16x16 inch.", price: 449, discountPrice: 329, image: IMG.blockPrint, category: CATEGORIES["artisan-products"], shopId: SHOPS.varun, origin: "made-in-india", stock: 90, benefits: ["Natural vegetable dyes", "Hand block-printed", "100% cotton"] },
  { name: "Madhubani Art Wall Frame A4", slug: "madhubani-art-wall-frame-a4", description: "Original Madhubani painting on handmade paper. Artwork by certified artisans from Mithila, Bihar.", price: 1299, discountPrice: 999, image: IMG.woodArt, category: CATEGORIES["artisan-products"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 30, benefits: ["Original artwork", "Natural wood frame", "Certificate of authenticity"] },
  { name: "Terracotta Hanging Planter Set of 2", slug: "terracotta-hanging-planter-set-of-2", description: "Handcrafted terracotta planters with macrame hangers. Ideal for succulents and small herbs.", price: 699, discountPrice: 549, image: IMG.pottery, category: CATEGORIES["artisan-products"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 70 },

  // ── Eco-Friendly Products ────────────────────────────────
  { name: "Bamboo Drinking Straws Pack of 12", slug: "bamboo-drinking-straws-pack-of-12", description: "Reusable bamboo straws with cleaning brush. Natural, biodegradable alternative to plastic straws.", price: 249, discountPrice: 179, image: IMG.bambooStraw, category: CATEGORIES["eco-friendly-products"], shopId: SHOPS.varun, origin: "made-in-india", stock: 250, benefits: ["Plastic-free", "Includes cleaning brush", "Biodegradable"] },
  { name: "Recycled Newspaper Gift Bags Set of 6", slug: "recycled-newspaper-gift-bags-set-of-6", description: "Gift bags made from recycled newspapers. Strong, stylish, and 100% plastic-free.", price: 199, discountPrice: 149, image: IMG.jute, category: CATEGORIES["eco-friendly-products"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 300, benefits: ["100% recycled", "Plastic-free", "Unique patterns"] },
  { name: "Natural Loofah Bath Scrubber", slug: "natural-loofah-bath-scrubber", description: "100% natural dried loofah grown in India. Exfoliates skin and decomposes completely after use.", price: 149, discountPrice: 99, image: IMG.soapBar, category: CATEGORIES["eco-friendly-products"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 400, benefits: ["Natural exfoliant", "100% biodegradable", "Plastic-free"] },

  // ── Natural Products ─────────────────────────────────────
  { name: "Pure Lavender Essential Oil 15ml", slug: "pure-lavender-essential-oil-15ml", description: "Steam-distilled pure lavender essential oil. For aromatherapy, diffusers, and DIY skincare.", price: 499, discountPrice: 379, image: IMG.essOil, category: CATEGORIES["natural-products"], shopId: SHOPS.varun, origin: "made-in-india", stock: 100, benefits: ["100% pure", "Promotes relaxation", "Versatile use"] },
  { name: "Neem and Charcoal Detox Soap Bar", slug: "neem-charcoal-detox-soap-bar", description: "Cold-process soap with activated charcoal, neem oil, and tea tree. Deep cleanses and controls acne.", price: 199, discountPrice: 149, image: IMG.soapBar, category: CATEGORIES["natural-products"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 200, ingredients: ["Activated Charcoal", "Neem Oil", "Tea Tree Oil", "Coconut Oil"], benefits: ["Detoxifies skin", "Controls acne", "No SLS"] },
  { name: "Rose and Sandalwood Body Butter", slug: "rose-sandalwood-body-butter", description: "Rich body butter with shea, cocoa butter, rose and sandalwood oils. Deeply nourishes skin.", price: 549, discountPrice: 399, image: IMG.orgSerum, category: CATEGORIES["natural-products"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 80, ingredients: ["Shea Butter", "Cocoa Butter", "Rose Oil", "Sandalwood Oil"], benefits: ["Deep moisturisation", "Long-lasting fragrance", "No mineral oil"] },

  // ── Handmade Crafts ──────────────────────────────────────
  { name: "Macrame Wall Hanging Boho Style", slug: "macrame-wall-hanging-boho-style", description: "Handcrafted macrame wall hanging in natural cotton cord. Perfect for living rooms and bedrooms.", price: 899, discountPrice: 699, image: IMG.macrame, category: CATEGORIES["handmade-crafts"], shopId: SHOPS.varun, origin: "made-in-india", stock: 40, benefits: ["Handcrafted", "Natural cotton cord", "Unique boho design"] },
  { name: "Handmade Soy Wax Candle Vanilla", slug: "handmade-soy-wax-candle-vanilla", description: "Pure soy wax candle with natural vanilla fragrance. Cotton wick, no paraffin, burns 40+ hours.", price: 399, discountPrice: 299, image: IMG.candle, category: CATEGORIES["handmade-crafts"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 120, benefits: ["40+ hour burn", "No paraffin", "Natural cotton wick"] },
  { name: "Hand Embroidered Coin Purse", slug: "hand-embroidered-coin-purse", description: "Hand-embroidered coin purse from Kutch, Gujarat. Traditional mirror work with zip closure.", price: 299, discountPrice: 219, image: IMG.jewelry, category: CATEGORIES["handmade-crafts"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 80, benefits: ["Kutch embroidery", "Mirror work", "Supports artisan women"] },
  { name: "Resin Art Coasters Set of 4", slug: "resin-art-coasters-set-of-4", description: "Handcrafted resin coasters with pressed flowers and gold foil. Heat and water resistant.", price: 599, discountPrice: 449, image: IMG.woodArt, category: CATEGORIES["handmade-crafts"], shopId: SHOPS.varun, origin: "made-in-india", stock: 50, benefits: ["Heat resistant", "Waterproof", "Unique pressed flower design"] },

  // ── Handmade Products ────────────────────────────────────
  { name: "Handmade Lavender Goat Milk Soap", slug: "handmade-lavender-goat-milk-soap", description: "Cold-process soap with goat milk, lavender oil, and oat flour. Gentle for sensitive skin.", price: 249, discountPrice: 179, image: IMG.soapBar, category: CATEGORIES["handmade-products"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 150, ingredients: ["Goat Milk", "Lavender Oil", "Oat Flour", "Coconut Oil"], benefits: ["Gentle on sensitive skin", "Natural moisturiser"] },
  { name: "Handmade Beaded Bracelet Boho", slug: "handmade-beaded-bracelet-boho", description: "Hand-strung bracelet with natural stone beads — amethyst, lapis, and turquoise. Adjustable cord.", price: 349, discountPrice: 249, image: IMG.jewelry, category: CATEGORIES["handmade-products"], shopId: SHOPS.bhavya, origin: "made-in-india", stock: 70, benefits: ["Natural stone beads", "Adjustable size", "Unique design"] },
  { name: "Home Made Rose and Honey Face Pack 100g", slug: "home-made-rose-honey-face-pack-100g", description: "Face pack with dried rose petals, raw honey, and multani mitti. No preservatives, small batch.", price: 299, discountPrice: 219, image: IMG.orgFace, category: CATEGORIES["handmade-products"], shopId: SHOPS.varun, origin: "made-in-india", stock: 60, ingredients: ["Dried Rose Petals", "Raw Honey", "Multani Mitti", "Sandalwood Powder"], benefits: ["Brightens skin", "Deep cleanses", "No preservatives"] },
  { name: "Handmade Crochet Plant Hanger", slug: "handmade-crochet-plant-hanger", description: "Hand-crocheted plant hanger in natural cotton. Holds pots up to 6 inch.", price: 399, discountPrice: 299, image: IMG.macrame, category: CATEGORIES["handmade-products"], shopId: SHOPS.mihir, origin: "made-in-india", stock: 55, benefits: ["Hand crocheted", "Natural cotton", "Holds 6 inch pots"] },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== SEED_SECRET) {
    return withCORS(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }

  try {
    await connectDB();
    await import("@/lib/models/shop");
    await import("@/lib/models/category");

    let created = 0;
    let skipped = 0;
    const results: { name: string; status: string }[] = [];

    for (const p of PRODUCTS) {
      const existing = await Product.findOne({ slug: p.slug });
      if (existing) {
        skipped++;
        results.push({ name: p.name, status: "skipped (already exists)" });
        continue;
      }

      await Product.create({
        ...p,
        images: [p.image],
        approvalStatus: "approved",
        isActive: true,
        submittedAt: new Date(),
        approvedAt: new Date(),
      });

      created++;
      results.push({ name: p.name, status: "created" });
    }

    return withCORS(NextResponse.json({
      summary: { created, skipped, total: PRODUCTS.length },
      results,
    }));
  } catch (error: any) {
    console.error("Seed error:", error);
    return withCORS(NextResponse.json({ error: error.message }, { status: 500 }));
  }
}