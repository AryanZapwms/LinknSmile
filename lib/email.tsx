import nodemailer from "nodemailer"
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) {
    return transporter
  }

  const email = process.env.GMAIL_EMAIL
  const appPassword = process.env.GMAIL_APP_PASSWORD

  if (!email || !appPassword) {
    console.error("Gmail credentials not configured in environment variables")
    return null
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: appPassword, // Use App Password, not regular password
    },
    tls: {
    rejectUnauthorized: false, 
  },
  })

  return transporter
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    const emailTransporter = getTransporter()

    if (!emailTransporter) {
      console.error(" Email transporter not configured")
      return false
    }

    await emailTransporter.sendMail({
      from: process.env.GMAIL_EMAIL,
      to,
      subject,
      html,
    })

    console.log(` Email sent successfully to ${to}`)
    return true
  } catch (error) {
    console.error(" Email sending failed:", error)
    return false
  }
}

export function getWelcomeEmail(name: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50;
            background-color: #f8f9fa;
          }
          .email-wrapper {
            background-color: #f8f9fa;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); 
            color: white; 
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 15px;
            display: inline-block;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
          }
          .header p {
            font-size: 14px;
            opacity: 0.95;
          }
          .content { 
            padding: 40px 30px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #2c3e50;
          }
          .greeting strong {
            color: #7c3aed;
            font-weight: 600;
          }
          .text-block {
            margin-bottom: 20px;
            font-size: 15px;
            line-height: 1.8;
            color: #34495e;
          }
          .features {
            background: linear-gradient(to bottom, #faf7f2 0%, #ffffff 100%);
            border-left: 4px solid #7c3aed;
            padding: 20px;
            margin: 25px 0;
            border-radius: 6px;
          }
          .features h3 {
            color: #7c3aed;
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: 600;
          }
          .features ul {
            list-style: none;
            padding-left: 0;
          }
          .features li {
            padding: 8px 0;
            padding-left: 25px;
            position: relative;
            font-size: 14px;
            color: #34495e;
          }
          .features li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #7c3aed;
            font-weight: bold;
            font-size: 16px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            font-size: 15px;
            transition: transform 0.2s;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            text-decoration: none;
          }
          .divider {
            height: 1px;
            background: #ecf0f1;
            margin: 30px 0;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #ecf0f1;
          }
          .footer-links {
            margin-bottom: 15px;
          }
          .footer-links a {
            color: #7c3aed;
            text-decoration: none;
            font-size: 13px;
            margin: 0 10px;
          }
          .footer-links a:hover {
            text-decoration: underline;
          }
          .footer-text {
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 15px;
            line-height: 1.6;
          }
          .website-link {
            color: #7c3aed;
            text-decoration: none;
            font-weight: 600;
          }
          .website-link:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <img src="https://instapeels.com/companylogo.jpg" alt="Instapeels Logo" class="logo">
              <h1>Welcome to Instapeels!</h1>
              <p>Premium Skincare Solutions</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="greeting">Hello <strong>${name}</strong>,</p>
              
              <p class="text-block">
                Thank you for creating an account with us! We're thrilled to welcome you to the Instapeels family. You're now part of our growing community of skincare enthusiasts who trust us for premium, effective skincare solutions.
              </p>

              <div class="features">
                <h3>What You Can Do Now:</h3>
                <ul>
                  <li>Browse our curated collection of premium skincare products</li>
                  <li>Receive personalized product recommendations</li>
                  <li>Track your orders in real-time</li>
                  <li>Save your favorite products for quick checkout</li>
                  <li>Enjoy exclusive member-only deals and early access to new launches</li>
                  <li>Get skincare tips and professional advice</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="https://instapeels.com/shop" class="cta-button">Start Shopping Now</a>
              </div>

              <p class="text-block">
                At Instapeels, we're committed to providing you with the highest quality skincare products backed by science and expertise. Our team is dedicated to helping you achieve your best skin.
              </p>

              <p class="text-block">
                If you have any questions or need assistance, our dedicated support team is here to help. Don't hesitate to reach out!
              </p>

              <p class="text-block">
                Welcome aboard! Happy skincare journey! 🌿
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-links">
                <a href="https://instapeels.com">Home</a>
                <a href="https://instapeels.com/shop">Shop</a>
                <a href="https://instapeels.com/blog">Blog</a>
                <a href="https://instapeels.com/profile">Account</a>
              </div>
              <div class="footer-text">
                <p><strong>Instapeels</strong></p>
                <p>Premium Skincare for Everyone</p>
                <p style="margin-top: 10px; color: #95a5a6;">
                  📧 care@instapeels.com | 🌐 www.instapeels.com
                </p>
                <p style="margin-top: 15px; color: #bdc3c7;">
                  &copy; 2025 Instapeels.com. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getOrderConfirmationEmail({
  customerName,
  orderId,
  items,
  total,
  orderDate,
  paymentStatus = "pending",
}: {
  customerName: string
  orderId: string
  items: Array<{
    name: string
    quantity: number
    price: number
    selectedSize?: {
      size: string
      unit: string
      quantity: number
      price: number
      discountPrice?: number
    }
  }>
  total: number
  orderDate?: string
  paymentStatus?: string
}) {
  const itemsHtml = (items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #ecf0f1;">
          <div style="color: #2c3e50; font-weight: 500;">${item.name}</div>
          ${
            item.selectedSize
              ? `<div style="color: #7f8c8d; font-size: 13px; margin-top: 5px;">
                  Size: ${item.selectedSize.size} (${item.selectedSize.quantity}${item.selectedSize.unit})
                </div>`
              : ""
          }
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #ecf0f1; text-align: center; color: #34495e;">
          ${item.quantity}
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #ecf0f1; text-align: right; color: #7c3aed; font-weight: 600;">
          ₹${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `,
    )
    .join("")

  const itemsSubtotal = (items || []).reduce((sum, item) => sum + item.price * item.quantity, 0)

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50;
            background-color: #f8f9fa;
          }
          .email-wrapper {
            background-color: #f8f9fa;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); 
            color: white; 
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 20px;
            display: inline-block;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 5px;
            letter-spacing: -0.5px;
          }
          .header p {
            font-size: 14px;
            opacity: 0.95;
          }
          .content { 
            padding: 40px 30px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #2c3e50;
          }
          .greeting strong {
            color: #7c3aed;
            font-weight: 600;
          }
          .text-block {
            margin-bottom: 20px;
            font-size: 15px;
            line-height: 1.8;
            color: #34495e;
          }
          .status-badge {
            display: inline-block;
            background: #d4edda;
            color: #155724;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 20px;
          }
          .order-info {
            background: linear-gradient(to bottom, #faf7f2 0%, #ffffff 100%);
            border: 1px solid #f5e6d3;
            border-left: 4px solid #7c3aed;
            padding: 20px;
            margin: 20px 0;
            border-radius: 6px;
          }
          .order-info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #ecf0f1;
          }
          .order-info-row:last-child {
            border-bottom: none;
          }
          .order-info-label {
            font-weight: 600;
            color: #7c3aed;
            font-size: 13px;
          }
          .order-info-value {
            color: #34495e;
            font-size: 14px;
            font-weight: 500;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
          }
          .items-table thead tr {
            background: #faf7f2;
            border-bottom: 2px solid #7c3aed;
          }
          .items-table thead th {
            padding: 15px;
            text-align: left;
            color: #7c3aed;
            font-weight: 700;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .items-table tbody tr:last-child td {
            border-bottom: none;
          }
          .price-summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
          }
          .price-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 14px;
            color: #34495e;
          }
          .price-row.total {
            border-top: 2px solid #ecf0f1;
            padding-top: 15px;
            margin-top: 10px;
            font-size: 16px;
            font-weight: 700;
            color: #7c3aed;
          }
          .shipping-info {
            background: #e8f4f8;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 20px 0;
            border-radius: 6px;
          }
          .shipping-info h4 {
            color: #2980b9;
            font-size: 14px;
            margin-bottom: 8px;
          }
          .shipping-info p {
            font-size: 13px;
            color: #34495e;
            margin: 5px 0;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            font-size: 15px;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #ecf0f1;
          }
          .footer-links {
            margin-bottom: 15px;
          }
          .footer-links a {
            color: #7c3aed;
            text-decoration: none;
            font-size: 13px;
            margin: 0 10px;
          }
          .footer-links a:hover {
            text-decoration: underline;
          }
          .footer-text {
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 15px;
            line-height: 1.6;
          }
          .support-text {
            font-size: 13px;
            color: #7f8c8d;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ecf0f1;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <img src="https://instapeels.com/companylogo.jpg" alt="Instapeels Logo" class="logo">
              <h1>Order Confirmation</h1>
              <p>Your order has been received!</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="greeting">Hello <strong>${customerName}</strong>,</p>
              
              <div class="status-badge">✓ Order Confirmed</div>

              <p class="text-block">
                Thank you for your order! We've received it and it's now being processed. You'll receive a tracking number via email once your items ship.
              </p>

              <!-- Order Information -->
              <div class="order-info">
                <div class="order-info-row">
                  <span class="order-info-label">Order ID</span>
                  <span class="order-info-value">${orderId}</span>
                </div>
                <div class="order-info-row">
                  <span class="order-info-label">Order Date</span>
                  <span class="order-info-value">${orderDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="order-info-row">
                  <span class="order-info-label">Payment Status</span>
                  <span class="order-info-value" style="color: ${paymentStatus === 'completed' ? '#27ae60' : '#f39c12'}; font-weight: 700;">
                    ${paymentStatus === 'completed' ? '✓ Payment Received' : '⏱ Pending - Pay on Delivery'}
                  </span>
                </div>
              </div>

              <!-- Items Table -->
              <h3 style="color: #2c3e50; font-size: 16px; margin-bottom: 15px; font-weight: 600;">Order Items</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Price Summary -->
              <div class="price-summary">
                <div class="price-row">
                  <span>Subtotal</span>
                  <span>₹${itemsSubtotal.toFixed(2)}</span>
                </div>
                <div class="price-row">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div class="price-row total">
                  <span>Total Amount</span>
                  <span>₹${total.toFixed(2)}</span>
                </div>
              </div>

              <!-- Shipping Information -->
              <div class="shipping-info">
                <h4>📦 What Happens Next?</h4>
                <p>✓ Your order is being packed with care</p>
                <p>✓ We'll send you a tracking number within 24 hours</p>
                <p>✓ Expected delivery: 3-5 business days</p>
              </div>

              <div style="text-align: center;">
                <a href="https://instapeels.com/profile/orders" class="cta-button">Track Your Order</a>
              </div>

              <p class="text-block">
                If you have any questions about your order or our products, our customer support team is here to help. We're committed to ensuring you have the best experience with Instapeels.
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-links">
                <a href="https://instapeels.com">Home</a>
                <a href="https://instapeels.com/shop">Shop</a>
                <a href="https://instapeels.com/blog">Blog</a>
                <a href="https://instapeels.com/profile/orders">Orders</a>
              </div>
              <div class="footer-text">
                <p><strong>Instapeels</strong></p>
                <p>Premium Skincare for Everyone</p>
                <p style="margin-top: 10px; color: #95a5a6;">
                  📧 care@instapeels.com | 🌐 www.instapeels.com
                </p>
                <p style="margin-top: 15px; color: #bdc3c7;">
                  &copy; 2025 Instapeels.com. All rights reserved.
                </p>
              </div>
              <div class="support-text">
                If you need any assistance, please don't hesitate to reach out to our support team.
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getOrderStatusUpdateEmail({
  customerName,
  orderId,
  orderStatus,
  items,
  paymentStatus,
  totalAmount,
}: {
  customerName: string
  orderId: string
  orderStatus: string
  items: Array<{
    name: string
    quantity: number
    price: number
    selectedSize?: {
      size: string
      unit: string
      quantity: number
      price: number
      discountPrice?: number
    }
  }>
  paymentStatus: string
  totalAmount: number
}) {
  const itemsHtml = (items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">
          <div style="color: #2c3e50; font-weight: 500;">${item.name}</div>
          ${
            item.selectedSize
              ? `<div style="color: #7f8c8d; font-size: 13px; margin-top: 5px;">
                  Size: ${item.selectedSize.size} (${item.selectedSize.quantity}${item.selectedSize.unit})
                </div>`
              : ""
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: center; color: #34495e;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right; color: #7c3aed; font-weight: 600;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `,
    )
    .join("")

  const statusColors: { [key: string]: string } = {
    pending: "#ffc107",
    processing: "#3498db",
    shipped: "#2ecc71",
    delivered: "#27ae60",
    cancelled: "#e74c3c",
  }

  const statusBgColor = statusColors[orderStatus] || "#95a5a6"
  const statusMessage: { [key: string]: string } = {
    pending: "Your order is pending and will be processed soon.",
    processing: "Your order is being packed and will ship soon.",
    shipped: "Your order has been shipped! Track it now.",
    delivered: "Your order has been delivered. Thank you for your purchase!",
    cancelled: "Your order has been cancelled.",
  }

  const paymentInfo = paymentStatus === "completed" 
    ? `<p style="color: #27ae60; font-weight: 600;">✓ Payment Received: ₹${totalAmount.toFixed(2)}</p>`
    : `<p style="color: #f39c12; font-weight: 600;">⏱ Amount to Pay on Delivery: ₹${totalAmount.toFixed(2)}</p>`

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50;
            background-color: #f8f9fa;
          }
          .email-wrapper {
            background-color: #f8f9fa;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); 
            color: white; 
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 15px;
            display: inline-block;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 10px;
            letter-spacing: -0.5px;
          }
          .header p {
            font-size: 14px;
            opacity: 0.95;
          }
          .content { 
            padding: 40px 30px;
          }
          .greeting {
            font-size: 16px;
            margin-bottom: 20px;
            color: #2c3e50;
          }
          .greeting strong {
            color: #7c3aed;
            font-weight: 600;
          }
          .status-badge {
            display: inline-block;
            background-color: ${statusBgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin: 15px 0;
            text-transform: capitalize;
          }
          .text-block {
            margin-bottom: 20px;
            font-size: 15px;
            line-height: 1.8;
            color: #34495e;
          }
          .order-details {
            background: #faf7f2;
            border-left: 4px solid #7c3aed;
            padding: 20px;
            margin: 20px 0;
            border-radius: 6px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          .detail-label {
            font-weight: 600;
            color: #7c3aed;
          }
          .detail-value {
            color: #34495e;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table thead tr {
            background: #faf7f2;
            border-bottom: 2px solid #7c3aed;
          }
          .items-table thead th {
            padding: 12px;
            text-align: left;
            color: #7c3aed;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
          }
          .payment-status {
            background: #f0f7ff;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 20px 0;
            border-radius: 6px;
          }
          .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
            font-size: 15px;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #ecf0f1;
          }
          .footer-links {
            margin-bottom: 15px;
          }
          .footer-links a {
            color: #7c3aed;
            text-decoration: none;
            font-size: 13px;
            margin: 0 10px;
          }
          .footer-text {
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 15px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <!-- Header -->
            <div class="header">
              <img src="https://instapeels.com/companylogo.jpg" alt="Instapeels Logo" class="logo">
              <h1>Order Update</h1>
              <p>Your order status has been updated</p>
            </div>

            <!-- Content -->
            <div class="content">
              <p class="greeting">Hello <strong>${customerName}</strong>,</p>
              
              <p class="text-block">
                We're excited to share an update on your order!
              </p>

              <div style="text-align: center;">
                <span class="status-badge">${orderStatus.toUpperCase()}</span>
              </div>

              <p class="text-block" style="margin-top: 20px;">
                ${statusMessage[orderStatus] || "Your order status has been updated."}
              </p>

              <!-- Order Details -->
              <div class="order-details">
                <div class="detail-row">
                  <span class="detail-label">Order ID:</span>
                  <span class="detail-value">${orderId}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value" style="text-transform: capitalize; color: ${statusBgColor}; font-weight: 600;">${orderStatus}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Total Amount:</span>
                  <span class="detail-value">₹${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <!-- Items -->
              <h3 style="color: #2c3e50; font-size: 16px; margin-bottom: 15px; font-weight: 600; margin-top: 30px;">Order Items</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Payment Status -->
              <div class="payment-status">
                ${paymentInfo}
              </div>

              <div style="text-align: center;">
                <a href="https://instapeels.com/profile/orders" class="cta-button">Track Your Order</a>
              </div>

              <p class="text-block">
                If you have any questions about your order, please don't hesitate to contact us. We're here to help!
              </p>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-links">
                <a href="https://instapeels.com">Home</a>
                <a href="https://instapeels.com/shop">Shop</a>
                <a href="https://instapeels.com/blog">Blog</a>
                <a href="https://instapeels.com/profile/orders">Orders</a>
              </div>
              <div class="footer-text">
                <p><strong>Instapeels</strong></p>
                <p>Premium Skincare for Everyone</p>
                <p style="margin-top: 10px; color: #95a5a6;">
                  📧 care@instapeels.com | 🌐 www.instapeels.com
                </p>
                <p style="margin-top: 15px; color: #bdc3c7;">
                  &copy; 2025 Instapeels.com. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getAdminOrderNotificationEmail({
  customerName,
  customerEmail,
  customerPhone,
  orderId,
  items,
  totalAmount,
  paymentStatus,
  paymentMethod,
  shippingAddress,
  orderDate,
}: {
  customerName: string
  customerEmail: string
  customerPhone: string
  orderId: string
  items: Array<{
    name: string
    quantity: number
    price: number
    selectedSize?: {
      size: string
      unit: string
      quantity: number
      price: number
      discountPrice?: number
    }
  }>
  totalAmount: number
  paymentStatus: string
  paymentMethod: string
  shippingAddress: {
    name: string
    phone: string
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  orderDate?: string
}) {
  const itemsHtml = (items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1;">
          <div style="color: #2c3e50; font-weight: 500;">${item.name}</div>
          ${
            item.selectedSize
              ? `<div style="color: #7f8c8d; font-size: 13px; margin-top: 5px;">
                  Size: ${item.selectedSize.size} (${item.selectedSize.quantity}${item.selectedSize.unit})
                </div>`
              : ""
          }
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: center; color: #34495e;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; text-align: right; color: #7c3aed; font-weight: 600;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `,
    )
    .join("")

  const itemsSubtotal = (items || []).reduce((sum, item) => sum + item.price * item.quantity, 0)

  const paymentStatusColor = paymentStatus === 'completed' ? '#27ae60' : '#f39c12'
  const paymentStatusText = paymentStatus === 'completed' ? '✓ PAID' : '⏱ PENDING - COD'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50;
            background-color: #f8f9fa;
          }
          .email-wrapper {
            background-color: #f8f9fa;
            padding: 20px;
          }
          .container { 
            max-width: 700px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .alert-header {
            background: linear-gradient(135deg, #c0392b 0%, #e74c3c 100%);
            color: white;
            padding: 25px 30px;
            text-align: center;
            border-bottom: 4px solid #a93226;
          }
          .alert-header h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .alert-header p {
            font-size: 14px;
            opacity: 0.95;
            margin-top: 5px;
          }
          .content { 
            padding: 30px;
          }
          .section-title {
            background: #f5e6d3;
            color: #7c3aed;
            padding: 12px 15px;
            border-left: 4px solid #7c3aed;
            font-weight: 700;
            font-size: 14px;
            margin-top: 20px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .section-title:first-child {
            margin-top: 0;
          }
          .info-block {
            background: #faf7f2;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e8dcc8;
            font-size: 14px;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-weight: 600;
            color: #7c3aed;
            min-width: 120px;
          }
          .info-value {
            color: #34495e;
            font-weight: 500;
            text-align: right;
            flex: 1;
            padding-left: 10px;
          }
          .payment-badge {
            display: inline-block;
            background: ${paymentStatusColor};
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            background: white;
          }
          .items-table thead tr {
            background: #f5e6d3;
            border-bottom: 2px solid #7c3aed;
          }
          .items-table thead th {
            padding: 12px;
            text-align: left;
            color: #7c3aed;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
          }
          .items-table tbody td {
            padding: 12px;
            border-bottom: 1px solid #ecf0f1;
          }
          .items-table tbody tr:last-child td {
            border-bottom: none;
          }
          .total-section {
            background: #f5e6d3;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            padding: 8px 0;
            border-bottom: 1px solid #e8dcc8;
          }
          .total-row:last-child {
            border-bottom: none;
          }
          .total-row.grand-total {
            border-top: 2px solid #7c3aed;
            padding-top: 12px;
            margin-top: 8px;
            font-size: 16px;
            font-weight: 700;
            color: #7c3aed;
          }
          .address-box {
            background: #e8f4f8;
            border-left: 4px solid #3498db;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
          }
          .address-box p {
            font-size: 13px;
            color: #34495e;
            margin: 5px 0;
            line-height: 1.6;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #ecf0f1;
            font-size: 11px;
            color: #7f8c8d;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="container">
            <!-- Alert Header -->
            <div class="alert-header">
              <h1>🚨 NEW ORDER RECEIVED</h1>
              <p>Order ID: ${orderId} | ${orderDate || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Customer Information -->
              <div class="section-title">👤 Customer Information</div>
              <div class="info-block">
                <div class="info-row">
                  <span class="info-label">Name:</span>
                  <span class="info-value">${customerName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value"><strong>${customerEmail}</strong></span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span class="info-value"><strong>${customerPhone}</strong></span>
                </div>
              </div>

              <!-- Shipping Address -->
              <div class="section-title">📦 Shipping Address</div>
              <div class="address-box">
                <p><strong>${shippingAddress.name}</strong></p>
                <p>${shippingAddress.street}</p>
                <p>${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}</p>
                <p>${shippingAddress.country}</p>
                <p style="margin-top: 8px; border-top: 1px solid #b3d9e8; padding-top: 8px;">📱 ${shippingAddress.phone}</p>
              </div>

              <!-- Order Items -->
              <div class="section-title">📋 Order Items</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th style="text-align: center; width: 80px;">Qty</th>
                    <th style="text-align: right; width: 100px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Price Summary -->
              <div class="total-section">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>₹${itemsSubtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                  <span>Shipping:</span>
                  <span>Free</span>
                </div>
                <div class="total-row grand-total">
                  <span>TOTAL AMOUNT:</span>
                  <span>₹${totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <!-- Payment Details -->
              <div class="section-title">💳 Payment Details</div>
              <div class="info-block">
                <div class="info-row">
                  <span class="info-label">Payment Method:</span>
                  <span class="info-value" style="text-transform: uppercase; font-weight: 600;">${paymentMethod}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Payment Status:</span>
                  <span class="info-value"><span class="payment-badge">${paymentStatusText}</span></span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p><strong>Instapeels Order Management System</strong></p>
              <p>This is an automated admin notification. Please process this order accordingly.</p>
              <p style="margin-top: 10px; border-top: 1px solid #ecf0f1; padding-top: 10px;">
                &copy; 2025 Instapeels.com. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getPayoutRequestedEmail({ shopName, amount, requestId }: { shopName: string, amount: number, requestId: string }) {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"><style>body{font-family:sans-serif;line-height:1.6;color:#333;}.container{max-width:600px;margin:20px auto;border:1px solid #eee;padding:20px;border-radius:10px;}.header{background:#7c3aed;color:white;padding:15px;text-align:center;border-radius:10px 10px 0 0;}.content{padding:20px;}.footer{text-align:center;font-size:12px;color:#888;margin-top:20px;}</style></head>
      <body>
        <div class="container">
          <div class="header"><h1>New Payout Request</h1></div>
          <div class="content">
            <p>Admin,</p>
            <p>A new payout request has been submitted by <strong>${shopName}</strong>.</p>
            <div style="background:#f9f9f9;padding:15px;border-radius:5px;margin:15px 0;">
              <p><strong>Amount:</strong> ₹${amount.toLocaleString()}</p>
              <p><strong>Request ID:</strong> ${requestId}</p>
            </div>
            <p>Please review and process this request in the admin panel.</p>
            <div style="text-align:center;"><a href="https://linkandsmile.com/admin/payouts" style="background:#7c3aed;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Request</a></div>
          </div>
          <div class="footer"><p>&copy; 2026 LinkAndSmile</p></div>
        </div>
      </body>
    </html>
  `
}

export function getPayoutStatusEmail({ shopName, amount, status, transactionId, failureReason }: { shopName: string, amount: number, status: string, transactionId?: string, failureReason?: string }) {
  const statusColors: any = { 'processing': '#3498db', 'completed': '#27ae60', 'failed': '#e74c3c' };
  const statusTitles: any = { 'processing': 'Payout Approved', 'completed': 'Payout Completed', 'failed': 'Payout Rejected' };
  
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="UTF-8"><style>body{font-family:sans-serif;line-height:1.6;color:#333;}.container{max-width:600px;margin:20px auto;border:1px solid #eee;padding:20px;border-radius:10px;}.header{background:${statusColors[status] || '#7c3aed'};color:white;padding:15px;text-align:center;border-radius:10px 10px 0 0;}.content{padding:20px;}.footer{text-align:center;font-size:12px;color:#888;margin-top:20px;}</style></head>
      <body>
        <div class="container">
          <div class="header"><h1>${statusTitles[status] || 'Payout Update'}</h1></div>
          <div class="content">
            <p>Hello ${shopName},</p>
            <p>Your payout request for <strong>₹${amount.toLocaleString()}</strong> has been updated to <strong>${status}</strong>.</p>
            
            ${transactionId ? `<p><strong>Transaction ID:</strong> ${transactionId}</p>` : ''}
            ${failureReason ? `<p style="color:#e74c3c"><strong>Reason:</strong> ${failureReason}</p>` : ''}
            
            <p>You can track all your payouts in your dashboard.</p>
            <div style="text-align:center;"><a href="https://linkandsmile.com/vendor/payouts" style="background:#7c3aed;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Check Dashboard</a></div>
          </div>
          <div class="footer"><p>&copy; 2026 LinkAndSmile</p></div>
        </div>
      </body>
    </html>
  `
}
