const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const shopSchema = new mongoose.Schema({ shopName: String, ownerId: mongoose.Schema.Types.ObjectId });
const productSchema = new mongoose.Schema({ name: String, shopId: mongoose.Schema.Types.Mixed });

async function checkData() {
  await mongoose.connect(MONGODB_URI);
  const Shop = mongoose.models.Shop || mongoose.model('Shop', shopSchema);
  const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

  const shops = await Shop.find({}, 'shopName');
  console.log('Shops (total: ' + shops.length + '):', JSON.stringify(shops, null, 2));

  const missingShopProducts = await Product.find({ shopId: { $exists: false } });
  console.log('Products missing shopId:', missingShopProducts.length);
  
  const invalidShopProducts = await Product.find({ shopId: 'default' });
  console.log('Products with "default" shopId:', invalidShopProducts.length);

  const nullShopProducts = await Product.find({ shopId: null });
  console.log('Products with null shopId:', nullShopProducts.length);

  if (shops.length > 0) {
    const firstShopId = shops[0]._id;
    console.log('First Shop ID (for fallback):', firstShopId);
  }

  process.exit(0);
}

checkData().catch(e => {
    console.error(e);
    process.exit(1);
});
