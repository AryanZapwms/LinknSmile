import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string; // product._id
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  image?: string;
  quantity: number;
  stock: number;

  
  // ✅ NEW: Multi-vendor fields
  shopId: string;
  shopName: string;
  commissionRate: number; // percentage (e.g., 10 for 10%)
  
  // Size variant support (existing)
  selectedSize?: {
    size: string;
    unit: "ml" | "l" | "g" | "kg";
    quantity: number;
    price: number;
    discountPrice?: number;
    stock: number;
  };
  
  // Product details
  company?: {
    _id: string;
    name: string;
    slug: string
  };
  category?: {
    _id: string;
    name: string;
  };
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string, sizeId?: string) => void;
  updateQuantity: (id: string, quantity: number, sizeId?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemsByVendor: () => Record<string, CartItem[]>; // ✅ NEW: Group by vendor
  getVendorTotal: (shopId: string) => number; // ✅ NEW: Total per vendor
  getCommissionBreakdown: () => { // ✅ NEW: Commission calculation
    subtotal: number;
    totalCommission: number;
    vendorEarnings: number;
    byVendor: Array<{
      shopId: string;
      shopName: string;
      subtotal: number;
      commission: number;
      earnings: number;
      commissionRate: number;
    }>;
  };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          const existingItemIndex = state.items.findIndex((i) => {
            if (item.selectedSize) {
              return (
                i.productId === item.productId &&
                i.selectedSize?.size === item.selectedSize.size &&
                i.selectedSize?.quantity === item.selectedSize.quantity
              );
            }
            return i.productId === item.productId;
          });

          if (existingItemIndex > -1) {
            // Item exists, increase quantity
            const newItems = [...state.items];
            const existingItem = newItems[existingItemIndex];
            const maxStock = item.selectedSize
              ? item.selectedSize.stock
              : item.stock;

            if (existingItem.quantity < maxStock) {
              newItems[existingItemIndex] = {
                ...existingItem,
                quantity: existingItem.quantity + item.quantity,
              };
            }
            return { items: newItems };
          }

          // New item
          return { items: [...state.items, item] };
        });
      },

      removeItem: (id, sizeId) => {
        set((state) => ({
          items: state.items.filter((item) => {
            if (sizeId && item.selectedSize) {
              return !(
                item.productId === id &&
                `${item.selectedSize.size}-${item.selectedSize.quantity}` === sizeId
              );
            }
            return item.productId !== id;
          }),
        }));
      },

      updateQuantity: (id, quantity, sizeId) => {
        set((state) => ({
          items: state.items.map((item) => {
            const matches = sizeId
              ? item.productId === id &&
                `${item.selectedSize?.size}-${item.selectedSize?.quantity}` === sizeId
              : item.productId === id;

            if (matches) {
              const maxStock = item.selectedSize ? item.selectedSize.stock : item.stock;
              const newQuantity = Math.max(0, Math.min(quantity, maxStock));
              return { ...item, quantity: newQuantity };
            }
            return item;
          }).filter((item) => item.quantity > 0),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          const price = item.selectedSize
            ? item.selectedSize.discountPrice || item.selectedSize.price
            : item.discountPrice || item.price;
          return total + price * item.quantity;
        }, 0);
      },

      // ✅ NEW: Group items by vendor
     getItemsByVendor: () => {
  const items = get().items;
  const grouped: Record<string, CartItem[]> = {};

  items.forEach((item) => {
    const vendorId = item.shopId || 'platform'; // fallback to 'platform' for old products
    if (!grouped[vendorId]) {
      grouped[vendorId] = [];
    }
    grouped[vendorId].push(item);
  });

  return grouped;
},

      // ✅ NEW: Get total for specific vendor
      getVendorTotal: (shopId: string) => {
  return get().items
    .filter((item) => item.shopId === shopId || (!item.shopId && shopId === 'platform'))
    .reduce((total, item) => {
      const price = item.selectedSize
        ? item.selectedSize.discountPrice || item.selectedSize.price
        : item.discountPrice || item.price;
      return total + price * item.quantity;
    }, 0);
},


      // ✅ NEW: Calculate commission breakdown
getCommissionBreakdown: () => {
  const items = get().items;
  const itemsByVendor = get().getItemsByVendor();
  
  let subtotal = 0;
  let totalCommission = 0;
  const byVendor: Array<{
    shopId: string;
    shopName: string;
    subtotal: number;
    commission: number;
    earnings: number;
    commissionRate: number;
  }> = [];

  Object.entries(itemsByVendor).forEach(([shopId, vendorItems]) => {
    const vendorSubtotal = vendorItems.reduce((sum, item) => {
      const price = item.selectedSize
        ? item.selectedSize.discountPrice || item.selectedSize.price
        : item.discountPrice || item.price;
      return sum + price * item.quantity;
    }, 0);

    const commissionRate = vendorItems[0]?.commissionRate || 10; // Default 10%
    const commission = (vendorSubtotal * commissionRate) / 100;
    const earnings = vendorSubtotal - commission;

    subtotal += vendorSubtotal;
    totalCommission += commission;

    byVendor.push({
      shopId,
      shopName: vendorItems[0]?.shopName || 'LinkAndSmile Platform',
      subtotal: vendorSubtotal,
      commission,
      earnings,
      commissionRate,
    });
  });

  return {
    subtotal,
    totalCommission,
    vendorEarnings: subtotal - totalCommission,
    byVendor,
  };
},
    }),
    {
      name: 'cart-storage',
    }
  )
);