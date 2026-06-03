// audit_all_collections.js
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

const BAD_DOMAINS = ["ibef.org", "website-files.com", "verveculture.com", 
  "istockphoto.com", "themanufacturer-cdn", "friendlyturtle.com", 
  "infomiss.com", "IMG_6191", "th_480x480", "verveculture"];

function hasBadUrl(val) {
  if (!val || typeof val !== "string") return false;
  return BAD_DOMAINS.some(d => val.includes(d));
}

function scanObject(obj) {
  if (!obj || typeof obj !== "object") return false;
  return Object.values(obj).some(v => {
    if (typeof v === "string") return hasBadUrl(v);
    if (Array.isArray(v)) return v.some(i => typeof i === "string" ? hasBadUrl(i) : scanObject(i));
    if (typeof v === "object") return scanObject(v);
    return false;
  });
}

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`Scanning ${collections.length} collections...\n`);

  for (const col of collections) {
    const docs = await mongoose.connection.db.collection(col.name).find({}).toArray();
    const bad = docs.filter(scanObject);
    if (bad.length > 0) {
      console.log(`❌ ${col.name}: ${bad.length} docs with external images`);
      bad.forEach(d => console.log(`   - ${d._id} | ${d.name || d.title || d.slug || ""}`));
    } else {
      console.log(`✅ ${col.name}: clean`);
    }
  }

  process.exit(0);
}

audit().catch(console.error);