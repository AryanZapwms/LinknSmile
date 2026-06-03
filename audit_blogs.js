// audit_blogs.js
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);

  const Blog = mongoose.model("Blog", new mongoose.Schema({
    title: String,
    image: String,
    images: [String],
    content: String,
  }), "blogs");

  const blogs = await Blog.find({}).lean();
  console.log(`Total blogs: ${blogs.length}`);

  const bad = blogs.filter(b => {
    const all = [b.image, ...(b.images || [])].filter(Boolean);
    return all.some(u => u && !u.includes("res.cloudinary.com") && !u.includes("linknsmile.com"));
  });

  console.log(`Blogs with external images: ${bad.length}`);
  bad.forEach(b => console.log(`- "${b.title}": ${b.image}`));

  process.exit(0);
}

audit().catch(console.error);