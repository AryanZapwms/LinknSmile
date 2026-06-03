// audit_categories.js
const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);
  const docs = await mongoose.connection.db.collection("categories").find({}).toArray();
  docs.forEach(d => {
    console.log(`\n${d.name}`);
    console.log(`  image: ${d.image}`);
    if (d.icon) console.log(`  icon: ${d.icon}`);
    if (d.banner) console.log(`  banner: ${d.banner}`);
  });
  process.exit(0);
}

audit().catch(console.error);