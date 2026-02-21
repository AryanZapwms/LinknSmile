const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://work_db_user:work_db_user@cluster0.crwv2s7.mongodb.net/?appName=Cluster0';

async function audit() {
  await mongoose.connect(MONGODB_URI);
  const Product = mongoose.model('ProductAudit', new mongoose.Schema({ 
    name: String, 
    shopId: mongoose.Schema.Types.Mixed 
  }), 'products');

  const products = await Product.find().lean();
  console.log('Total products:', products.length);

  const problematic = products.filter(p => {
    if (!p.shopId) return true;
    if (typeof p.shopId === 'string' && p.shopId.length !== 24) return true;
    if (typeof p.shopId === 'string' && p.shopId === 'default') return true;
    return false;
  });

  console.log('Problematic products found:', problematic.length);
  problematic.forEach(p => {
      console.log(`- ${p.name}: shopId = ${JSON.stringify(p.shopId)}`);
  });

  process.exit(0);
}

audit();
