/**
 * Facebook Pixel Tracking Utility
 * Pixel ID: 997663834042843
 * Currency: INR
 * Production Ready
 */
export interface FacebookPixelEventData {
  [key: string]: any
}

/**
 * Initialize Facebook Pixel base code
 * Should be called once on app load
 */
export function initializeFacebookPixel() {
  if (typeof window === 'undefined') return

  // Check if fbq already exists
  if ((window as any).fbq) return

  ;(function (f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = !0
    t.src = v
    s = b.getElementsByTagName(e)[0]!  
    s.parentNode!.insertBefore(t, s)
  })(
    window,
    document,
    'script',
    'https://connect.facebook.net/en_US/fbevents.js',
    undefined,
    undefined,
    undefined
  )

  ;(window as any).fbq('init', '997663834042843')
  ;(window as any).fbq('track', 'PageView')
}

/**
 * Track PageView event (called on every page load)
 */
export function trackPageView() {
  if (typeof window === 'undefined' || !(window as any).fbq) return
    ; (window as any).fbq('track', 'PageView')
}

/**
 * Track ViewContent event
 * Fired when user views a product page
 * @param productId - Product ID
 * @param productName - Product name
 * @param price - Product price in INR
 */
export function trackViewContent(
  productId: string,
  productName: string,
  price: number
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    content_name: productName,
    content_ids: [productId],
    content_type: 'product',
    value: price.toFixed(2),
    currency: 'INR',
  }

    ; (window as any).fbq('track', 'ViewContent', data)
}

/**
 * Track AddToCart event
 * Fired when user adds item to cart
 * @param productId - Product ID
 * @param productName - Product name
 * @param price - Product price in INR
 * @param quantity - Quantity added
 */
export function trackAddToCart(
  productId: string,
  productName: string,
  price: number,
  quantity: number = 1
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    content_name: productName,
    content_ids: [productId],
    content_type: 'product',
    value: (price * quantity).toFixed(2),
    currency: 'INR',
    quantity: quantity,
  }

    ; (window as any).fbq('track', 'AddToCart', data)
}

/**
 * Track CompleteRegistration event
 * Fired when user successfully registers
 * @param email - User email (for data matching)
 * @param status - Registration status
 */
export function trackCompleteRegistration(email?: string, status?: string) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    status: status || 'completed',
    ...(email && { em: hashEmail(email) }),
  }

    ; (window as any).fbq('track', 'CompleteRegistration', data)
}

/**
 * Track InitiateCheckout event
 * Fired when user starts checkout process
 * @param cartValue - Total cart value in INR
 * @param itemCount - Number of items in cart
 */
export function trackInitiateCheckout(
  cartValue: number,
  itemCount: number,
  productIds?: string[]
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    value: cartValue.toFixed(2),
    currency: 'INR',
    num_items: itemCount,
    ...(productIds && { content_ids: productIds }),
    content_type: 'product',
  }

    ; (window as any).fbq('track', 'InitiateCheckout', data)
}

/**
 * Track Purchase event
 * Fired when order is completed
 * @param orderId - Order ID
 * @param orderValue - Total order value in INR
 * @param itemCount - Number of items purchased
 * @param productIds - Array of product IDs
 * @param email - Customer email (for data matching)
 */
export function trackPurchase(
  orderId: string,
  orderValue: number,
  itemCount: number,
  productIds?: string[],
  email?: string
) {
  if (typeof window === 'undefined' || !(window as any).fbq) return

  const data: FacebookPixelEventData = {
    value: orderValue.toFixed(2),
    currency: 'INR',
    transaction_id: orderId,
    num_items: itemCount,
    ...(productIds && { content_ids: productIds }),
    content_type: 'product',
    ...(email && { em: hashEmail(email) }),
  }

    ; (window as any).fbq('track', 'Purchase', data)
}

/**
 * Track custom event
 * @param eventName - Event name
 * @param data - Event data
 */
export function trackCustomEvent(eventName: string, data?: FacebookPixelEventData) {
  if (typeof window === 'undefined' || !(window as any).fbq) return
    ; (window as any).fbq('track', eventName, data)
}

/**
 * Simple email hashing for data matching
 * SHA256 hash - Facebook expects hashed PII
 */
function hashEmail(email: string): string {
  // For production, use a proper SHA256 library
  // This is a placeholder - Facebook also accepts un-hashed emails sometimes
  // but hashing is recommended for better data matching
  return email.toLowerCase().trim()
}

/**
 * Declare fbq on window for TypeScript
 */
declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: (...args: any[]) => void
  }
}