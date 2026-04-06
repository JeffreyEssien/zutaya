import nodemailer from "nodemailer";
import type { Order } from "@/types";
import { SITE_NAME, SITE_EMAIL, WHATSAPP_NUMBER, SITE_URL } from "@/lib/constants";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL || SITE_EMAIL,
    pass: process.env.SMTP_PASSWORD, // Gmail App Password
  },
});

function formatItemsHtml(order: Order): string {
  return order.items
    .map(
      (i) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f0f7; font-size: 14px; color: #1a1a2e;">
          ${i.product.name}
          ${i.variant ? `<span style="color: #999; font-size: 12px;"> (${i.variant.name})</span>` : ""}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f0f7; text-align: center; font-size: 14px; color: #666;">
          ${i.quantity}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f0f7; text-align: right; font-size: 14px; color: #666;">
          ₦${(i.variant?.price || i.product.price).toLocaleString()}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f0f7; text-align: right; font-size: 14px; font-weight: 600; color: #1a1a2e;">
          ₦${((i.variant?.price || i.product.price) * i.quantity).toLocaleString()}
        </td>
      </tr>`
    )
    .join("");
}

function buildReceiptHtml(order: Order): string {
  const a = order.shippingAddress;
  const date = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="background:#1A1A1A;border-bottom:4px solid #C0392B; border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; font-size: 28px; letter-spacing: 4px; margin: 0 0 4px 0;">${SITE_NAME}</h1>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#C8955A;margin-top:4px;">Order Receipt</p>
    </div>

    <!-- Order Info -->
    <div style="background: white; padding: 32px; border-left: 1px solid #f3f0f7; border-right: 1px solid #f3f0f7;">
      
      <!-- Greeting -->
      <p style="font-size: 16px; color: #1a1a2e; margin: 0 0 4px 0;">Hi ${a.firstName},</p>
      <p style="font-size: 14px; color: #888; margin: 0 0 24px 0;">Thank you for your order! Here's your receipt.</p>

      <!-- Order ID & Date -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
        <div>
          <p style="font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px 0;">Order</p>
          <p style="font-size: 13px; font-family: monospace; color: #1a1a2e; background: #f8f7fa; padding: 4px 10px; border-radius: 20px; display: inline-block; margin: 0;">${order.id}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px 0;">Date</p>
          <p style="font-size: 13px; color: #666; margin: 0;">${date}</p>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="border-bottom: 2px solid #f3f0f7;">
            <th style="text-align: left; padding: 8px 0; font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px;">Product</th>
            <th style="text-align: center; padding: 8px 0; font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px;">Qty</th>
            <th style="text-align: right; padding: 8px 0; font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px;">Price</th>
            <th style="text-align: right; padding: 8px 0; font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${formatItemsHtml(order)}
        </tbody>
      </table>

      <!-- Totals -->
      <div style="border-top: 1px solid #f3f0f7; padding-top: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; color: #888;">Subtotal</span>
          <span style="font-size: 14px; color: #666;">₦${order.subtotal.toLocaleString()}</span>
        </div>
        ${order.discountTotal ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-size: 14px; color: #10b981;">Discount${order.couponCode ? ` (${order.couponCode})` : ""}</span>
          <span style="font-size: 14px; color: #10b981;">-₦${order.discountTotal.toLocaleString()}</span>
        </div>` : ""}
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-size: 14px; color: #888;">Shipping</span>
          <span style="font-size: 14px; color: #666;">${order.shipping === 0 ? "Free" : `₦${order.shipping.toLocaleString()}`}</span>
        </div>
        <div style="border-top: 1px solid #f3f0f7; padding-top: 12px; display: flex; justify-content: space-between;">
          <span style="font-size: 16px; font-weight: 700; color: #1a1a2e;">Total</span>
          <span style="font-size: 20px; font-weight: 700; color: #1a1a2e;">₦${order.total.toLocaleString()}</span>
        </div>
      </div>

      <!-- Shipping Address -->
      <div style="margin-top: 24px; padding: 20px; background: #f8f7fa; border-radius: 12px;">
        <p style="font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">Shipping To</p>
        <p style="font-size: 14px; color: #1a1a2e; margin: 0 0 2px 0; font-weight: 500;">${order.customerName}</p>
        <p style="font-size: 13px; color: #666; margin: 0 0 2px 0;">${a.address}</p>
        <p style="font-size: 13px; color: #666; margin: 0 0 2px 0;">${a.city}, ${a.state} ${a.zip}</p>
        <p style="font-size: 13px; color: #666; margin: 0;">Nigeria</p>
        ${order.deliveryZone ? `<p style="font-size: 12px; color: #C0392B; margin: 8px 0 0 0; font-weight: 500;">📍 Zone: ${order.deliveryZone} &bull; ${order.deliveryType === 'hub_pickup' ? 'Hub Pickup' : 'Doorstep Delivery'}</p>` : ''}
        ${order.deliveryDiscount ? `<p style="font-size: 11px; color: #10b981; margin: 4px 0 0 0;">🎉 ${order.deliveryDiscount.percent}% delivery discount applied${order.deliveryDiscount.label ? ` (${order.deliveryDiscount.label})` : ''}</p>` : ''}
      </div>

      ${order.paymentMethod === "bank_transfer" ? `
      <!-- Payment Notice -->
      <div style="margin-top: 16px; padding: 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px;">
        <p style="font-size: 13px; color: #92400e; margin: 0; font-weight: 500;">⏳ Payment Pending</p>
        <p style="font-size: 12px; color: #a16207; margin: 4px 0 0 0;">Please complete your bank transfer to process this order.</p>
      </div>` : ""}
    </div>

    <!-- Footer -->
    <div style="background: #f8f7fa; border-radius: 0 0 16px 16px; padding: 24px; text-align: center; border: 1px solid #f3f0f7; border-top: none;">
      <a href="${SITE_URL}/track?id=${order.id}" style="display: inline-block; background:#1A1A1A;border-bottom:4px solid #C0392B; color: white; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 24px; border-radius: 25px; margin-bottom: 12px;">📦 Track Your Order →</a>
      <br>
      <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I have a question about my order.")}" style="display: inline-block; background: #25D366; color: white; text-decoration: none; font-size: 12px; font-weight: 600; padding: 8px 20px; border-radius: 20px; margin-bottom: 12px;">💬 Chat with us on WhatsApp</a>
      <p style="font-size: 12px; color: #aaa; margin: 0 0 4px 0;">
        We'll send you tracking info once your order ships.
      </p>
      <p style="font-size: 12px; color: #ccc; margin: 0;">
        With love, The ${SITE_NAME} Team
      </p>
    </div>

  </div>
</body>
</html>`;
}

function buildAdminNotificationHtml(order: Order): string {
  const a = order.shippingAddress;
  const paymentInfo = order.paymentMethod === "bank_transfer"
    ? `<p style="color: #2563eb; font-weight: 600;">💳 Payment Method: Bank Transfer (Awaiting Payment)</p>`
    : `<p style="color: #16a34a; font-weight: 600;">💬 Payment Method: WhatsApp</p>`;

  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f8f7fa;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: #1A1A1A; padding: 20px; color: white; border-bottom: 4px solid #C0392B;">
      <h2 style="margin: 0; font-size: 16px;">🛍️ New Order: ${order.id}</h2>
      <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.6;">${new Date(order.createdAt).toLocaleString()}</p>
    </div>
    <div style="padding: 20px; font-size: 14px; color: #333;">
      ${paymentInfo}
      <p><strong>Customer:</strong> ${order.customerName}</p>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Phone:</strong> ${order.phone}</p>
      <p><strong>Address:</strong> ${a.address}, ${a.city}, ${a.state}, Nigeria</p>
      ${order.deliveryZone ? `<p><strong>Delivery Zone:</strong> ${order.deliveryZone}</p>` : ''}
      ${order.deliveryType ? `<p><strong>Delivery Type:</strong> ${order.deliveryType === 'hub_pickup' ? 'Hub Pickup' : 'Doorstep Delivery'}</p>` : ''}
      ${order.deliveryDiscount ? `<p style="color: #10b981;"><strong>Delivery Discount:</strong> ${order.deliveryDiscount.percent}% off${order.deliveryDiscount.label ? ` (${order.deliveryDiscount.label})` : ''}</p>` : ''}
      <hr style="border: none; border-top: 1px solid #f3f0f7; margin: 16px 0;">
      <p><strong>Items:</strong></p>
      <ul style="padding-left: 20px;">
        ${order.items.map(i => `<li>${i.product.name} ×${i.quantity} — ₦${((i.variant?.price || i.product.price) * i.quantity).toLocaleString()}</li>`).join("")}
      </ul>
      <hr style="border: none; border-top: 1px solid #f3f0f7; margin: 16px 0;">
      <p><strong>Subtotal:</strong> ₦${order.subtotal.toLocaleString()}</p>
      ${order.discountTotal ? `<p style="color: #10b981;"><strong>Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ''}:</strong> -₦${order.discountTotal.toLocaleString()}</p>` : ''}
      <p><strong>Shipping:</strong> ${order.shipping === 0 ? 'Free' : `₦${order.shipping.toLocaleString()}`}</p>
      <p style="font-size: 18px;"><strong>Total: ₦${order.total.toLocaleString()}</strong></p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderEmails(order: Order): Promise<void> {
  // Skip if SMTP is not configured
  if (!process.env.SMTP_PASSWORD) {
    console.log("⚠️  SMTP_PASSWORD not set — skipping email send. Emails logged to console instead.");
    return;
  }

  try {
    // Send customer receipt
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: order.email,
      subject: `Your ${SITE_NAME} Order Receipt — ${order.id}`,
      html: buildReceiptHtml(order),
    });
    console.log(`✅ Customer receipt sent to ${order.email}`);

    // Send admin notification
    await transporter.sendMail({
      from: `"${SITE_NAME} Orders" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: SITE_EMAIL,
      subject: `🛍️ New Order: ${order.id} — ₦${order.total.toLocaleString()}`,
      html: buildAdminNotificationHtml(order),
    });
    console.log(`✅ Admin notification sent to ${SITE_EMAIL}`);
  } catch (error) {
    console.error("❌ Email send failed:", error);
  }
}

// ── Payment Approved Email ──
export async function sendPaymentApprovedEmail(order: Order): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const firstName = order.shippingAddress?.firstName || order.customerName.split(" ")[0];

  const html = buildStatusEmailHtml({
    firstName,
    orderId: order.id,
    total: order.total,
    emoji: "✅",
    title: "Payment Confirmed!",
    accentColor: "#10b981",
    accentBg: "#ecfdf5",
    message: "Great news! Your payment has been verified and confirmed. We're now preparing your order for shipment.",
    statusLabel: "Payment Confirmed",
    nextStep: "We'll notify you once your order has been shipped.",
  });

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: order.email,
      subject: `✅ Payment Confirmed — ${order.id} | ${SITE_NAME}`,
      html,
    });
    console.log(`✅ Payment approved email sent to ${order.email}`);
  } catch (error) {
    console.error("❌ Payment approved email failed:", error);
  }
}

// ── Order Shipped Email ──
export async function sendOrderShippedEmail(order: Order): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const firstName = order.shippingAddress?.firstName || order.customerName.split(" ")[0];
  const a = order.shippingAddress;

  const html = buildStatusEmailHtml({
    firstName,
    orderId: order.id,
    total: order.total,
    emoji: "📦",
    title: "Your Order Has Been Shipped!",
    accentColor: "#3b82f6",
    accentBg: "#eff6ff",
    message: "Your order is on its way! It has been packed with care and handed over to our delivery partner.",
    statusLabel: "Shipped",
    nextStep: `Your package is heading to: ${a.address}, ${a.city}, ${a.state}. We'll let you know once it's delivered.`,
  });

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: order.email,
      subject: `📦 Your Order Has Shipped — ${order.id} | ${SITE_NAME}`,
      html,
    });
    console.log(`✅ Order shipped email sent to ${order.email}`);
  } catch (error) {
    console.error("❌ Shipped email failed:", error);
  }
}

// ── Order Delivered Email ──
export async function sendOrderDeliveredEmail(order: Order): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const firstName = order.shippingAddress?.firstName || order.customerName.split(" ")[0];

  const html = buildStatusEmailHtml({
    firstName,
    orderId: order.id,
    total: order.total,
    emoji: "🎉",
    title: "Your Order Has Been Delivered!",
    accentColor: "#C0392B",
    accentBg: "#f5f3ff",
    message: "Your order has been successfully delivered! We hope you love your new items.",
    statusLabel: "Delivered",
    nextStep: "If you have any questions about your order, don't hesitate to reach out. Thank you for shopping with us! 💜",
  });

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: order.email,
      subject: `🎉 Order Delivered — ${order.id} | ${SITE_NAME}`,
      html,
    });
    console.log(`✅ Order delivered email sent to ${order.email}`);
  } catch (error) {
    console.error("❌ Delivered email failed:", error);
  }
}

// ── Shared Status Email Template ──
function buildStatusEmailHtml(params: {
  firstName: string;
  orderId: string;
  total: number;
  emoji: string;
  title: string;
  accentColor: string;
  accentBg: string;
  message: string;
  statusLabel: string;
  nextStep: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <!-- Header -->
    <div style="background:#1A1A1A;border-bottom:4px solid #C0392B; border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; font-size: 28px; letter-spacing: 4px; margin: 0 0 4px 0;">${SITE_NAME}</h1>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#C8955A;margin-top:4px;">Order Update</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 32px; border-left: 1px solid #f3f0f7; border-right: 1px solid #f3f0f7;">
      
      <!-- Status Icon -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; font-size: 32px; background: ${params.accentBg}; border-radius: 50%; text-align: center;">
          ${params.emoji}
        </div>
      </div>

      <h2 style="font-size: 22px; color: #1a1a2e; text-align: center; margin: 0 0 8px 0;">${params.title}</h2>
      
      <p style="font-size: 14px; color: #1a1a2e; margin: 0 0 4px 0;">Hi ${params.firstName},</p>
      <p style="font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">${params.message}</p>

      <!-- Order Info Card -->
      <div style="background: #f8f7fa; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <div>
            <p style="font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px 0;">Order</p>
            <p style="font-size: 13px; font-family: monospace; color: #1a1a2e; margin: 0;">${params.orderId}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px 0;">Total</p>
            <p style="font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0;">₦${params.total.toLocaleString()}</p>
          </div>
        </div>
        <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
          <p style="font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 4px 0;">Status</p>
          <span style="display: inline-block; font-size: 12px; font-weight: 600; color: ${params.accentColor}; background: ${params.accentBg}; padding: 4px 12px; border-radius: 20px;">
            ${params.statusLabel}
          </span>
        </div>
      </div>

      <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 0;">${params.nextStep}</p>
    </div>

    <!-- Footer -->
    <div style="background: #f8f7fa; border-radius: 0 0 16px 16px; padding: 24px; text-align: center; border: 1px solid #f3f0f7; border-top: none;">
      <a href="${SITE_URL}/track?id=${params.orderId}" style="display: inline-block; background:#1A1A1A;border-bottom:4px solid #C0392B; color: white; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 24px; border-radius: 25px; margin-bottom: 12px;">📦 Track Your Order →</a>
      <br>
      <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I have a question about my order.")}" style="display: inline-block; background: #25D366; color: white; text-decoration: none; font-size: 12px; font-weight: 600; padding: 8px 20px; border-radius: 20px; margin-bottom: 12px;">💬 Chat with us on WhatsApp</a>
      <p style="font-size: 12px; color: #ccc; margin: 0;">
        With love, The ${SITE_NAME} Team
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ── Review Request Email (sent days after delivery) ──
export async function sendReviewRequestEmail(order: Order): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const firstName = order.shippingAddress?.firstName || order.customerName.split(" ")[0];
  const itemNames = order.items.map(i => i.product.name).join(", ");
  const reorderMessage = encodeURIComponent(
    `Hi! I'd like to reorder from my previous order *${order.id}*. Same items please!\n\nItems: ${itemNames}`
  );

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <div style="background:#1A1A1A;border-bottom:4px solid #C0392B; border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; font-size: 28px; letter-spacing: 4px; margin: 0 0 4px 0;">${SITE_NAME}</h1>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#C8955A;margin-top:4px;">We'd Love Your Feedback</p>
    </div>

    <div style="background: white; padding: 32px; border-left: 1px solid #f3f0f7; border-right: 1px solid #f3f0f7;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; font-size: 32px; background: #fef3c7; border-radius: 50%; text-align: center;">⭐</div>
      </div>

      <h2 style="font-size: 22px; color: #1a1a2e; text-align: center; margin: 0 0 16px 0;">How Was Your Experience?</h2>

      <p style="font-size: 14px; color: #1a1a2e; margin: 0 0 4px 0;">Hi ${firstName},</p>
      <p style="font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">We hope you're loving your recent order! Your feedback helps us serve you better. Let us know how everything went — we'd truly appreciate it. 💜</p>

      <div style="background: #f8f7fa; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <p style="font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">Your Items</p>
        <p style="font-size: 14px; color: #1a1a2e; margin: 0;">${itemNames}</p>
      </div>

      <!-- CTA Buttons -->
      <div style="text-align: center;">
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I just received my order *${order.id}* and I wanted to share some feedback: `)}" style="display: inline-block; background: #25D366; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 25px; margin-bottom: 12px;">💬 Share Feedback on WhatsApp</a>
        <br>
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${reorderMessage}" style="display: inline-block; background: #C0392B; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 25px;">🔄 Reorder on WhatsApp</a>
      </div>
    </div>

    <div style="background: #f8f7fa; border-radius: 0 0 16px 16px; padding: 24px; text-align: center; border: 1px solid #f3f0f7; border-top: none;">
      <p style="font-size: 12px; color: #ccc; margin: 0;">With love, The ${SITE_NAME} Team</p>
    </div>

  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: order.email,
      subject: `⭐ How Was Your Order? — ${SITE_NAME}`,
      html,
    });
    console.log(`✅ Review request email sent to ${order.email}`);
  } catch (error) {
    console.error("❌ Review request email failed:", error);
  }
}

// ── Abandoned Cart Email ──
export async function sendAbandonedCartEmail(
  email: string,
  firstName: string,
  items: { name: string; price: number }[]
): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const itemList = items.map(i => `<li style="padding: 6px 0; font-size: 14px; color: #333;">${i.name} — ₦${i.price.toLocaleString()}</li>`).join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <div style="background:#1A1A1A;border-bottom:4px solid #C0392B; border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; font-size: 28px; letter-spacing: 4px; margin: 0 0 4px 0;">${SITE_NAME}</h1>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#C8955A;margin-top:4px;">You Left Something Behind</p>
    </div>

    <div style="background: white; padding: 32px; border-left: 1px solid #f3f0f7; border-right: 1px solid #f3f0f7;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; font-size: 32px; background: #fef2f2; border-radius: 50%; text-align: center;">🛒</div>
      </div>

      <h2 style="font-size: 22px; color: #1a1a2e; text-align: center; margin: 0 0 16px 0;">Complete Your Purchase</h2>

      <p style="font-size: 14px; color: #1a1a2e; margin: 0 0 4px 0;">Hi ${firstName},</p>
      <p style="font-size: 14px; color: #666; margin: 0 0 20px 0; line-height: 1.6;">We noticed you left some beautiful items in your cart. They're still waiting for you! 💜</p>

      <div style="background: #f8f7fa; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <p style="font-size: 10px; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 8px 0;">Your Items</p>
        <ul style="padding-left: 20px; margin: 0;">${itemList}</ul>
      </div>

      <div style="text-align: center;">
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I was shopping on your store and I'd like to complete my order. Here are the items I'm interested in: ${items.map(i => i.name).join(", ")}`)}" style="display: inline-block; background: #25D366; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 25px; margin-bottom: 12px;">💬 Complete Order on WhatsApp</a>
      </div>
    </div>

    <div style="background: #f8f7fa; border-radius: 0 0 16px 16px; padding: 24px; text-align: center; border: 1px solid #f3f0f7; border-top: none;">
      <p style="font-size: 12px; color: #ccc; margin: 0;">With love, The ${SITE_NAME} Team</p>
    </div>

  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: email,
      subject: `🛒 You Left Something Behind — ${SITE_NAME}`,
      html,
    });
    console.log(`✅ Abandoned cart email sent to ${email}`);
  } catch (error) {
    console.error("❌ Abandoned cart email failed:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Newsletter Emails
// ═══════════════════════════════════════════════════════════════════

export async function sendNewsletterWelcomeEmail(
  email: string,
  firstName?: string,
  unsubscribeToken?: string
): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const name = firstName || "there";
  const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FDF6EC;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <!-- Header -->
    <div style="background: #1A1A1A; border-bottom: 4px solid #C0392B; border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
      <h1 style="color: #FDF6EC; font-size: 32px; letter-spacing: 6px; margin: 0 0 6px 0; font-family: Georgia, serif;">${SITE_NAME}</h1>
      <p style="font-size: 12px; color: #C8955A; margin: 0; letter-spacing: 2px; text-transform: uppercase;">Welcome to the Family</p>
    </div>

    <!-- Body -->
    <div style="background: white; padding: 40px 32px; border-left: 1px solid #f3ede3; border-right: 1px solid #f3ede3;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; width: 72px; height: 72px; line-height: 72px; font-size: 36px; background: linear-gradient(135deg, #C0392B20, #C8955A20); border-radius: 50%; text-align: center;">
          🥩
        </div>
      </div>

      <h2 style="font-size: 24px; color: #1A1A1A; text-align: center; margin: 0 0 16px 0; font-family: Georgia, serif;">
        Welcome, ${name}!
      </h2>

      <p style="font-size: 15px; color: #7A5C3A; margin: 0 0 20px 0; line-height: 1.7; text-align: center;">
        You're now part of the ${SITE_NAME} community. Get ready for exclusive deals,
        freshest cuts, seasonal recipes, and first access to new arrivals — delivered straight to your inbox.
      </p>

      <div style="background: #FDF6EC; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #C8955A30;">
        <h3 style="font-size: 14px; color: #1A1A1A; margin: 0 0 12px 0; text-align: center; text-transform: uppercase; letter-spacing: 1px;">What to expect</h3>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #7A5C3A;">
              <span style="color: #C0392B; font-weight: bold; margin-right: 8px;">01</span> Weekly deals & flash sales
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #7A5C3A;">
              <span style="color: #C0392B; font-weight: bold; margin-right: 8px;">02</span> New product launches
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #7A5C3A;">
              <span style="color: #C0392B; font-weight: bold; margin-right: 8px;">03</span> Recipes & cooking tips
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: #7A5C3A;">
              <span style="color: #C0392B; font-weight: bold; margin-right: 8px;">04</span> Subscriber-only discounts
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 28px;">
        <a href="${SITE_URL}/shop" style="display: inline-block; background: #C0392B; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 36px; border-radius: 8px; letter-spacing: 0.5px;">Shop Now</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #1A1A1A; border-radius: 0 0 16px 16px; padding: 24px; text-align: center;">
      <p style="font-size: 12px; color: #C8955A; margin: 0 0 8px 0;">With love, The ${SITE_NAME} Team</p>
      <a href="${unsubUrl}" style="font-size: 11px; color: #666; text-decoration: underline;">Unsubscribe</a>
    </div>

  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: email,
      subject: `Welcome to ${SITE_NAME}! 🥩`,
      html,
    });
    console.log(`✅ Newsletter welcome email sent to ${email}`);
  } catch (error) {
    console.error("❌ Newsletter welcome email failed:", error);
  }
}

export async function sendNewsletterCampaignEmail(
  email: string,
  subject: string,
  content: string,
  unsubscribeToken: string
): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const unsubUrl = `${SITE_URL}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FDF6EC;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <div style="background: #1A1A1A; border-bottom: 4px solid #C0392B; border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: #FDF6EC; font-size: 28px; letter-spacing: 4px; margin: 0; font-family: Georgia, serif;">${SITE_NAME}</h1>
    </div>

    <div style="background: white; padding: 36px 32px; border-left: 1px solid #f3ede3; border-right: 1px solid #f3ede3;">
      <div style="font-size: 15px; color: #1A1A1A; line-height: 1.7;">
        ${content}
      </div>

      <div style="text-align: center; margin-top: 32px;">
        <a href="${SITE_URL}/shop" style="display: inline-block; background: #C0392B; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 36px; border-radius: 8px;">Shop Now</a>
      </div>
    </div>

    <div style="background: #1A1A1A; border-radius: 0 0 16px 16px; padding: 24px; text-align: center;">
      <p style="font-size: 12px; color: #C8955A; margin: 0 0 8px 0;">The ${SITE_NAME} Team</p>
      <a href="${unsubUrl}" style="font-size: 11px; color: #666; text-decoration: underline;">Unsubscribe</a>
    </div>

  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
    to: email,
    subject: `${subject} — ${SITE_NAME}`,
    html,
  });
}

export async function sendSubscriptionConfirmedEmail(
  email: string,
  customerName: string,
  frequency: string,
  items: { productName: string; quantity: number; price: number }[],
  nextOrderDate: string
): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const firstName = customerName.split(" ")[0];
  const freqLabel = frequency === "weekly" ? "Weekly" : frequency === "biweekly" ? "Bi-weekly" : "Monthly";
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const formattedDate = new Date(nextOrderDate).toLocaleDateString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemRows = items.map(i => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f3ede3; font-size: 14px; color: #1A1A1A;">${i.productName}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f3ede3; text-align: center; font-size: 14px; color: #7A5C3A;">${i.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f3ede3; text-align: right; font-size: 14px; font-weight: 600; color: #1A1A1A;">\u20A6${(i.price * i.quantity).toLocaleString()}</td>
    </tr>`).join("");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FDF6EC;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <div style="background: #1A1A1A; border-bottom: 4px solid #C0392B; border-radius: 16px 16px 0 0; padding: 40px 32px; text-align: center;">
      <h1 style="color: #FDF6EC; font-size: 32px; letter-spacing: 6px; margin: 0 0 6px 0; font-family: Georgia, serif;">${SITE_NAME}</h1>
      <p style="font-size: 12px; color: #C8955A; margin: 0; letter-spacing: 2px; text-transform: uppercase;">Subscription Confirmed</p>
    </div>

    <div style="background: white; padding: 40px 32px; border-left: 1px solid #f3ede3; border-right: 1px solid #f3ede3;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 72px; height: 72px; line-height: 72px; font-size: 36px; background: #27AE6020; border-radius: 50%; text-align: center;">
          ✅
        </div>
      </div>

      <h2 style="font-size: 22px; color: #1A1A1A; text-align: center; margin: 0 0 8px 0; font-family: Georgia, serif;">
        You're All Set, ${firstName}!
      </h2>
      <p style="font-size: 15px; color: #7A5C3A; margin: 0 0 24px 0; line-height: 1.7; text-align: center;">
        Your ${freqLabel.toLowerCase()} meat box subscription is now active. Sit back and enjoy premium cuts delivered on schedule.
      </p>

      <div style="background: #FDF6EC; border-radius: 12px; padding: 20px; margin: 0 0 24px 0; border: 1px solid #C8955A30;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size: 12px; color: #7A5C3A; text-transform: uppercase; letter-spacing: 1px;">Frequency</td>
            <td style="text-align: right; font-size: 15px; font-weight: 600; color: #1A1A1A;">${freqLabel}</td>
          </tr>
          <tr>
            <td style="font-size: 12px; color: #7A5C3A; text-transform: uppercase; letter-spacing: 1px; padding-top: 12px;">Next Delivery</td>
            <td style="text-align: right; font-size: 15px; font-weight: 600; color: #C0392B; padding-top: 12px;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="font-size: 12px; color: #7A5C3A; text-transform: uppercase; letter-spacing: 1px; padding-top: 12px;">Per Delivery</td>
            <td style="text-align: right; font-size: 18px; font-weight: 700; color: #1A1A1A; padding-top: 12px;">\u20A6${total.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
        <thead>
          <tr style="border-bottom: 2px solid #f3ede3;">
            <th style="text-align: left; padding: 8px 0; font-size: 10px; color: #C8955A; text-transform: uppercase; letter-spacing: 1.5px;">Product</th>
            <th style="text-align: center; padding: 8px 0; font-size: 10px; color: #C8955A; text-transform: uppercase; letter-spacing: 1.5px;">Qty</th>
            <th style="text-align: right; padding: 8px 0; font-size: 10px; color: #C8955A; text-transform: uppercase; letter-spacing: 1.5px;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="text-align: center;">
        <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I just set up a meat subscription and I have a question.")}" style="display: inline-block; background: #25D366; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">Questions? Chat with Us</a>
      </div>
    </div>

    <div style="background: #1A1A1A; border-radius: 0 0 16px 16px; padding: 24px; text-align: center;">
      <p style="font-size: 12px; color: #C8955A; margin: 0;">With love, The ${SITE_NAME} Team</p>
    </div>

  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: email,
      subject: `✅ Subscription Confirmed — ${freqLabel} Meat Box | ${SITE_NAME}`,
      html,
    });
    console.log(`✅ Subscription confirmed email sent to ${email}`);
  } catch (error) {
    console.error("❌ Subscription confirmed email failed:", error);
  }
}

/**
 * Notify customer their subscription order was renewed.
 */
export async function sendSubscriptionRenewalEmail(
  email: string,
  customerName: string,
  orderId: string,
  items: { productName: string; quantity: number; price: number }[],
  nextOrderDate: string
): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const firstName = customerName.split(" ")[0];
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const formattedDate = new Date(nextOrderDate).toLocaleDateString("en-NG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const itemRows = items.map(i => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f3ede3; font-size: 14px; color: #1A1A1A;">${i.productName}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f3ede3; text-align: center; font-size: 14px; color: #7A5C3A;">×${i.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f3ede3; text-align: right; font-size: 14px; font-weight: 600; color: #1A1A1A;">₦${(i.price * i.quantity).toLocaleString()}</td>
    </tr>`).join("");

  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FDF6EC;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#1A1A1A;border-bottom:4px solid #C0392B;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
    <h1 style="color:#FDF6EC;font-size:32px;letter-spacing:6px;margin:0 0 6px;font-family:Georgia,serif;">${SITE_NAME}</h1>
    <p style="font-size:12px;color:#C8955A;margin:0;letter-spacing:2px;text-transform:uppercase;">Subscription Renewal</p>
  </div>
  <div style="background:white;padding:40px 32px;border-left:1px solid #f3ede3;border-right:1px solid #f3ede3;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:72px;height:72px;line-height:72px;font-size:36px;background:#C0392B20;border-radius:50%;">🔄</div>
    </div>
    <h2 style="font-size:22px;color:#1A1A1A;text-align:center;margin:0 0 8px;font-family:Georgia,serif;">Your Box is on the Way, ${firstName}!</h2>
    <p style="font-size:15px;color:#7A5C3A;margin:0 0 24px;line-height:1.7;text-align:center;">
      We've automatically renewed your subscription and placed order <strong style="color:#C0392B;">${orderId}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <thead><tr>
        <th style="text-align:left;padding:8px 0;border-bottom:2px solid #C8955A30;font-size:11px;color:#7A5C3A;text-transform:uppercase;letter-spacing:1px;">Item</th>
        <th style="text-align:center;padding:8px 0;border-bottom:2px solid #C8955A30;font-size:11px;color:#7A5C3A;text-transform:uppercase;letter-spacing:1px;">Qty</th>
        <th style="text-align:right;padding:8px 0;border-bottom:2px solid #C8955A30;font-size:11px;color:#7A5C3A;text-transform:uppercase;letter-spacing:1px;">Price</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
      <tfoot><tr>
        <td colspan="2" style="padding:12px 0;font-size:14px;font-weight:700;color:#1A1A1A;">Total</td>
        <td style="padding:12px 0;text-align:right;font-size:18px;font-weight:700;color:#C0392B;">₦${total.toLocaleString()}</td>
      </tr></tfoot>
    </table>
    <div style="background:#FDF6EC;border-radius:12px;padding:16px;text-align:center;border:1px solid #C8955A30;">
      <p style="font-size:12px;color:#7A5C3A;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Next Renewal</p>
      <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0;">${formattedDate}</p>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <a href="${SITE_URL}/track?id=${orderId}" style="display:inline-block;padding:14px 32px;background:#C0392B;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Track This Order</a>
    </div>
  </div>
  <div style="background:#1A1A1A;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="font-size:11px;color:#C8955A80;margin:0;">Need to pause or cancel? <a href="https://wa.me/${WHATSAPP_NUMBER}" style="color:#C8955A;">Contact us on WhatsApp</a></p>
  </div>
</div></body></html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: email,
      subject: `🔄 Subscription Renewed — Order ${orderId} | ${SITE_NAME}`,
      html,
    });
  } catch (error) {
    console.error("❌ Subscription renewal email failed:", error);
  }
}

/**
 * Notify customer their order is out for delivery.
 */
export async function sendDeliveryReminderEmail(order: Order): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;

  const firstName = order.customerName.split(" ")[0];
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FDF6EC;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#1A1A1A;border-bottom:4px solid #C0392B;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
    <h1 style="color:#FDF6EC;font-size:32px;letter-spacing:6px;margin:0 0 6px;font-family:Georgia,serif;">${SITE_NAME}</h1>
    <p style="font-size:12px;color:#C8955A;margin:0;letter-spacing:2px;text-transform:uppercase;">Delivery Update</p>
  </div>
  <div style="background:white;padding:40px 32px;border-left:1px solid #f3ede3;border-right:1px solid #f3ede3;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:72px;height:72px;line-height:72px;font-size:36px;background:#27AE6020;border-radius:50%;">🚚</div>
    </div>
    <h2 style="font-size:22px;color:#1A1A1A;text-align:center;margin:0 0 8px;font-family:Georgia,serif;">Heads Up, ${firstName}!</h2>
    <p style="font-size:15px;color:#7A5C3A;margin:0 0 24px;line-height:1.7;text-align:center;">
      Your order <strong style="color:#C0392B;">${order.id}</strong> is currently out for delivery. Please ensure someone is available to receive your package.
    </p>
    ${order.deliveryZone ? `<div style="background:#FDF6EC;border-radius:12px;padding:16px;text-align:center;border:1px solid #C8955A30;margin-bottom:24px;">
      <p style="font-size:12px;color:#7A5C3A;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;">Delivery Zone</p>
      <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0;">${order.deliveryZone}</p>
    </div>` : ""}
    <div style="text-align:center;">
      <a href="${SITE_URL}/track?id=${order.id}" style="display:inline-block;padding:14px 32px;background:#C0392B;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Track Your Order</a>
    </div>
  </div>
  <div style="background:#1A1A1A;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="font-size:11px;color:#C8955A80;margin:0;">Questions? <a href="https://wa.me/${WHATSAPP_NUMBER}" style="color:#C8955A;">WhatsApp us</a></p>
  </div>
</div></body></html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: order.email,
      subject: `🚚 Your Order is On the Way — ${order.id} | ${SITE_NAME}`,
      html,
    });
  } catch (error) {
    console.error("❌ Delivery reminder email failed:", error);
  }
}

/**
 * Alert admin about low stock items.
 */
export async function sendLowStockAlertEmail(
  items: { name: string; sku: string; stock: number; reorderLevel: number }[]
): Promise<void> {
  if (!process.env.SMTP_PASSWORD || items.length === 0) return;

  const rows = items.map(i => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f3ede3;font-size:14px;color:#1A1A1A;font-weight:500;">${i.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3ede3;font-size:12px;color:#7A5C3A;font-family:monospace;">${i.sku}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3ede3;text-align:center;font-size:16px;font-weight:700;color:${i.stock === 0 ? '#C0392B' : '#E67E22'};">${i.stock}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f3ede3;text-align:center;font-size:14px;color:#7A5C3A;">${i.reorderLevel}</td>
    </tr>`).join("");

  const outOfStock = items.filter(i => i.stock === 0).length;
  const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#FDF6EC;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:#1A1A1A;border-bottom:4px solid #E67E22;border-radius:16px 16px 0 0;padding:40px 32px;text-align:center;">
    <h1 style="color:#FDF6EC;font-size:32px;letter-spacing:6px;margin:0 0 6px;font-family:Georgia,serif;">${SITE_NAME}</h1>
    <p style="font-size:12px;color:#E67E22;margin:0;letter-spacing:2px;text-transform:uppercase;">Inventory Alert</p>
  </div>
  <div style="background:white;padding:40px 32px;border-left:1px solid #f3ede3;border-right:1px solid #f3ede3;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:72px;height:72px;line-height:72px;font-size:36px;background:#E67E2220;border-radius:50%;">⚠️</div>
    </div>
    <h2 style="font-size:22px;color:#1A1A1A;text-align:center;margin:0 0 8px;font-family:Georgia,serif;">Low Stock Alert</h2>
    <p style="font-size:15px;color:#7A5C3A;margin:0 0 24px;line-height:1.7;text-align:center;">
      <strong>${items.length}</strong> item${items.length > 1 ? "s" : ""} ${items.length > 1 ? "are" : "is"} running low${outOfStock > 0 ? ` — <span style="color:#C0392B;font-weight:700;">${outOfStock} out of stock</span>` : ""}.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead><tr>
        <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #C8955A30;font-size:11px;color:#7A5C3A;text-transform:uppercase;letter-spacing:1px;">Item</th>
        <th style="text-align:left;padding:8px 12px;border-bottom:2px solid #C8955A30;font-size:11px;color:#7A5C3A;text-transform:uppercase;letter-spacing:1px;">SKU</th>
        <th style="text-align:center;padding:8px 12px;border-bottom:2px solid #C8955A30;font-size:11px;color:#7A5C3A;text-transform:uppercase;letter-spacing:1px;">Stock</th>
        <th style="text-align:center;padding:8px 12px;border-bottom:2px solid #C8955A30;font-size:11px;color:#7A5C3A;text-transform:uppercase;letter-spacing:1px;">Reorder At</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="text-align:center;margin-top:24px;">
      <a href="${SITE_URL}/admin/inventory" style="display:inline-block;padding:14px 32px;background:#E67E22;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Manage Inventory</a>
    </div>
  </div>
  <div style="background:#1A1A1A;padding:20px 32px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="font-size:11px;color:#C8955A80;margin:0;">Automated inventory alert from ${SITE_NAME}</p>
  </div>
</div></body></html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: process.env.SMTP_EMAIL || SITE_EMAIL,
      subject: `⚠️ Low Stock Alert — ${items.length} items need attention | ${SITE_NAME}`,
      html,
    });
  } catch (error) {
    console.error("❌ Low stock alert email failed:", error);
  }
}
