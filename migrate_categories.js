// migrate_categories.js
const mongoose = require("mongoose");
const https = require("https");
const http = require("http");
require("dotenv").config({ path: ".env.local" });

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const trimmed = url.trim();
    const client = trimmed.startsWith("https") ? https : http;
    client.get(trimmed, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302)
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      if (res.statusCode !== 200)
        return reject(new Error(`HTTP ${res.statusCode} for ${trimmed}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function uploadToCloudinary(buffer, filename) {
  return new Promise((resolve, reject) => {
    const crypto = require("crypto");
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "link-and-smile/categories";
    const sigString = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash("sha1").update(sigString).digest("hex");
    const boundary = "----FormBoundary" + Math.random().toString(36);
    const fields = { timestamp: String(timestamp), api_key: CLOUDINARY_API_KEY, signature, folder };

    let body = "";
    for (const [k, v] of Object.entries(fields))
      body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
    body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;

    const payload = Buffer.concat([Buffer.from(body), buffer, Buffer.from(`\r\n--${boundary}--\r\n`)]);

    const options = {
      hostname: "api.cloudinary.com",
      path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": payload.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.secure_url) resolve(json.secure_url);
          else reject(new Error(json.error?.message || "No secure_url"));
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function isSafe(url) {
  if (!url) return true;
  return url.includes("res.cloudinary.com") || url.includes("linknsmile.com");
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected\n");

  const col = mongoose.connection.db.collection("categories");
  const categories = await col.find({}).toArray();

  for (const cat of categories) {
    if (isSafe(cat.image)) {
      console.log(`⏭  ${cat.name} — already safe`);
      continue;
    }
    console.log(`→ ${cat.name}`);
    try {
      const buf = await fetchBuffer(cat.image);
      const newUrl = await uploadToCloudinary(buf, `category-${cat._id}`);
      await col.updateOne({ _id: cat._id }, { $set: { image: newUrl } });
      console.log(`  ✅ ${newUrl}`);
    } catch (e) {
      console.log(`  ❌ Failed: ${e.message}`);
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

migrate().catch(console.error);