import nodemailer from "nodemailer";
import type { Order } from "@/types";
import { SITE_NAME, SITE_EMAIL, WHATSAPP_NUMBER, SITE_URL } from "@/lib/constants";
import { formatLineQuantity } from "@/lib/quantity";

// SMTP transport — defaults to Zoho Mail (smtppro.zoho.com). Override host/port
// via env to point elsewhere. Port 465 = implicit SSL; 587 = STARTTLS.
const SMTP_HOST = process.env.SMTP_HOST || "smtppro.zoho.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_USER = process.env.SMTP_EMAIL || SITE_EMAIL;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465 (SSL), false for 587 (STARTTLS)
  auth: {
    user: SMTP_USER,
    pass: process.env.SMTP_PASSWORD, // Zoho app-specific password
  },
});

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  await transporter.sendMail({
    from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
    to, subject, html,
  });
}

function formatItemsHtml(order: Order): string {
  return order.items
    .map(
      (i) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f0f7; font-size: 14px; color: #1a1a2e;">
          ${i.product.name}
          ${i.variant ? `<span style="color: #999; font-size: 12px;"> (${i.variant.name})</span>` : ""}
          ${i.selectedPrepOptions && i.selectedPrepOptions.length > 0 ? `<br><span style="font-size: 11px; color: #92400e;">Prep: ${i.selectedPrepOptions.map(p => p.label).join(", ")}</span>` : ""}
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #f3f0f7; text-align: center; font-size: 14px; color: #666;">
          ${formatLineQuantity(i)}
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

// ── Helpers for the order confirmation email ──

function formatDeliveryWindow(order: Order): { title: string; subtitle: string; eta: string } {
  // Scheduled delivery (customer picked a date)
  if (order.requestedDeliveryDate) {
    const d = new Date(order.requestedDeliveryDate);
    const dateLong = d.toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric" });
    const slotLabel: Record<string, string> = {
      morning: "Morning (8 AM – 12 PM)",
      afternoon: "Afternoon (12 PM – 4 PM)",
      evening: "Evening (4 PM – 7 PM)",
    };
    const slot = order.requestedDeliverySlot ? slotLabel[order.requestedDeliverySlot] : null;
    return {
      title: "Scheduled Delivery",
      subtitle: slot ? `${dateLong} · ${slot}` : dateLong,
      eta: dateLong,
    };
  }

  // Estimated next-day if ordered before noon, else day-after-next
  const placedAt = new Date(order.createdAt);
  const cutoff = new Date(placedAt);
  cutoff.setHours(12, 0, 0, 0);
  const daysOffset = placedAt < cutoff ? 1 : 2;
  const eta = new Date(placedAt);
  eta.setDate(eta.getDate() + daysOffset);
  const etaLong = eta.toLocaleDateString("en-NG", { weekday: "long", month: "long", day: "numeric" });
  return {
    title: "Estimated Delivery",
    subtitle: `Arrives by ${etaLong}`,
    eta: etaLong,
  };
}

function pipelineStepHtml(active: boolean, label: string, sub: string): string {
  const dotColor = active ? "#C0392B" : "#e5e7eb";
  const labelColor = active ? "#1a1a2e" : "#aaa";
  return `
    <td align="center" style="vertical-align:top;padding:0 4px;width:25%;">
      <div style="width:14px;height:14px;border-radius:50%;background:${dotColor};margin:0 auto 8px;"></div>
      <p style="font-size:11px;font-weight:600;color:${labelColor};margin:0 0 2px 0;line-height:1.2;">${label}</p>
      <p style="font-size:10px;color:#aaa;margin:0;line-height:1.2;">${sub}</p>
    </td>`;
}

function buildReceiptHtml(order: Order): string {
  const a = order.shippingAddress;
  const firstName = a.firstName || order.customerName.split(" ")[0];
  const placedAt = new Date(order.createdAt);
  const placedDate = placedAt.toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" });
  const placedTime = placedAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  const window = formatDeliveryWindow(order);
  const isPaid = order.paymentStatus === "payment_confirmed";
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
  const trackUrl = `${SITE_URL.replace(/\/$/, "")}/track?id=${order.id}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${SITE_NAME} Order is Confirmed</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f1ec;color:#1a1a1a;">
  <div style="max-width:620px;margin:0 auto;padding:24px 16px;">

    <!-- ── HEADER ── -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:18px 18px 0 0;overflow:hidden;">
      <tr>
        <td style="background:linear-gradient(135deg,#1A1A1A 0%,#2d1810 100%);border-bottom:4px solid #C0392B;padding:36px 28px;text-align:center;">
          <h1 style="color:#fff;font-size:30px;letter-spacing:5px;margin:0;font-weight:700;">${SITE_NAME.toUpperCase()}</h1>
          <p style="font-size:11px;color:#C8955A;margin:6px 0 0 0;letter-spacing:2px;text-transform:uppercase;">Premium Meat · Lagos</p>
        </td>
      </tr>
    </table>

    <!-- ── BIG CONFIRMATION ── -->
    <div style="background:#fff;padding:36px 28px 24px;border-left:1px solid #ece6dc;border-right:1px solid #ece6dc;text-align:center;">
      <div style="display:inline-block;width:64px;height:64px;background:#fef2ec;border-radius:50%;text-align:center;line-height:64px;font-size:30px;margin-bottom:16px;">🥩</div>
      <h2 style="font-size:26px;color:#1a1a1a;margin:0 0 6px 0;font-weight:700;">Order Confirmed${isPaid ? "" : ", payment pending"}!</h2>
      <p style="font-size:15px;color:#666;margin:0 0 22px 0;line-height:1.55;">
        Thank you, <strong style="color:#1a1a1a;">${firstName}</strong>. Your premium cuts are being readied with care.
      </p>

      <!-- Order ID badge -->
      <div style="display:inline-block;background:#f4f1ec;padding:8px 16px;border-radius:24px;font-family:'SF Mono',Menlo,monospace;font-size:13px;color:#1a1a1a;font-weight:600;letter-spacing:0.5px;">
        ${order.id}
      </div>
      <p style="font-size:11px;color:#999;margin:8px 0 0 0;">Placed ${placedDate} at ${placedTime}</p>
    </div>

    <!-- ── WHAT HAPPENS NEXT TIMELINE ── -->
    <div style="background:#fff;padding:8px 24px 28px;border-left:1px solid #ece6dc;border-right:1px solid #ece6dc;">
      <p style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin:24px 0 16px 0;text-align:center;">What Happens Next</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${pipelineStepHtml(true, "Confirmed", "You are here")}
          ${pipelineStepHtml(false, "Preparing", "Butchers at work")}
          ${pipelineStepHtml(false, "Packed", "Chilled & sealed")}
          ${pipelineStepHtml(false, "Delivered", window.eta)}
        </tr>
      </table>
    </div>

    <!-- ── DELIVERY ETA HERO CARD ── -->
    <div style="background:#fff;padding:0 24px 24px;border-left:1px solid #ece6dc;border-right:1px solid #ece6dc;">
      <div style="background:linear-gradient(135deg,#0a3d2e 0%,#1a5d44 100%);border-radius:14px;padding:22px 24px;color:#fff;">
        <p style="font-size:10px;color:#9bd4b8;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin:0 0 6px 0;">📅 ${window.title}</p>
        <p style="font-size:20px;color:#fff;margin:0 0 4px 0;font-weight:700;">${window.subtitle}</p>
        <p style="font-size:12px;color:#9bd4b8;margin:8px 0 0 0;line-height:1.5;">
          Our cold-chain logistics keep your cuts at peak freshness from our butchery to your door.
        </p>
      </div>
    </div>

    <!-- ── DELIVERY ADDRESS ── -->
    <div style="background:#fff;padding:0 24px 24px;border-left:1px solid #ece6dc;border-right:1px solid #ece6dc;">
      <p style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin:0 0 10px 0;">Delivering To</p>
      <div style="background:#f9f6f0;border:1px solid #ece6dc;border-radius:12px;padding:18px 20px;">
        <p style="font-size:15px;color:#1a1a1a;margin:0 0 4px 0;font-weight:600;">${order.customerName}</p>
        <p style="font-size:13px;color:#555;margin:0 0 2px 0;line-height:1.55;">${a.address}</p>
        <p style="font-size:13px;color:#555;margin:0 0 2px 0;line-height:1.55;">${a.city}${a.state ? `, ${a.state}` : ""} ${a.zip || ""}</p>
        <p style="font-size:13px;color:#555;margin:0;">📞 ${order.phone}</p>
        ${order.deliveryZone ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px dashed #d6cdbe;">
          <span style="display:inline-block;font-size:11px;color:#C0392B;background:#fef2ec;padding:4px 10px;border-radius:12px;font-weight:600;">📍 ${order.deliveryZone}</span>
          <span style="display:inline-block;font-size:11px;color:#555;margin-left:8px;">${order.deliveryType === "hub_pickup" ? "Hub Pickup" : "Doorstep Delivery"}</span>
        </div>` : ""}
        ${order.deliveryDiscount && order.deliveryDiscount.percent > 0 ? `
        <p style="font-size:11px;color:#10b981;margin:8px 0 0 0;font-weight:600;">🎉 ${order.deliveryDiscount.percent}% delivery discount applied${order.deliveryDiscount.label ? ` (${order.deliveryDiscount.label})` : ""}</p>` : ""}
      </div>
    </div>

    ${order.prepInstructions ? `
    <!-- ── PREP INSTRUCTIONS CONFIRMATION ── -->
    <div style="background:#fff;padding:0 24px 24px;border-left:1px solid #ece6dc;border-right:1px solid #ece6dc;">
      <p style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin:0 0 10px 0;">Your Prep Instructions</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 18px;">
        <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;">"${order.prepInstructions}"</p>
        <p style="font-size:11px;color:#a16207;margin:8px 0 0 0;font-weight:500;">✓ Our butchers will follow these instructions exactly.</p>
      </div>
    </div>` : ""}

    <!-- ── ORDER ITEMS ── -->
    <div style="background:#fff;padding:0 24px 24px;border-left:1px solid #ece6dc;border-right:1px solid #ece6dc;">
      <p style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:2px;font-weight:600;margin:0 0 12px 0;">Your Order · ${itemCount} item${itemCount === 1 ? "" : "s"}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="border-bottom:2px solid #ece6dc;">
            <th style="text-align:left;padding:10px 0;font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Item</th>
            <th style="text-align:center;padding:10px 0;font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Qty</th>
            <th style="text-align:right;padding:10px 0;font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.filter(i => !i.packageId).map(i => {
            const unitPrice = i.variant?.price ?? i.product.price;
            const lineTotal = unitPrice * i.quantity;
            return `
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #f4f1ec;font-size:14px;color:#1a1a1a;vertical-align:top;">
                <strong style="font-weight:600;">${i.product.name}</strong>
                ${i.variant ? `<br><span style="font-size:12px;color:#888;">${i.variant.name}</span>` : ""}
                ${i.selectedPrepOptions && i.selectedPrepOptions.length > 0 ? `<br><span style="font-size:11px;color:#C0392B;">🔪 ${i.selectedPrepOptions.map(p => p.label).join(", ")}</span>` : ""}
              </td>
              <td style="padding:14px 0;border-bottom:1px solid #f4f1ec;text-align:center;font-size:13px;color:#555;vertical-align:top;">×${i.quantity}</td>
              <td style="padding:14px 0;border-bottom:1px solid #f4f1ec;text-align:right;font-size:14px;color:#1a1a1a;font-weight:600;vertical-align:top;">₦${lineTotal.toLocaleString()}</td>
            </tr>`;
          }).join("")}
          ${(() => {
            // Group Zútaya Package lines into one row each at the package flat price.
            const groups = new Map<string, { name: string; price: number; boxes: number; lines: string[] }>();
            for (const i of order.items) {
              if (!i.packageId) continue;
              const g = groups.get(i.packageId) || { name: i.packageName || "Zútaya Package", price: i.packagePrice || 0, boxes: i.packageBoxes || 1, lines: [] };
              g.lines.push(`${i.product.name}${i.variant ? ` · ${i.variant.name}` : ""} ×${i.quantity}`);
              groups.set(i.packageId, g);
            }
            return Array.from(groups.values()).map(g => `
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid #f4f1ec;font-size:14px;color:#1a1a1a;vertical-align:top;">
                <strong style="font-weight:600;">📦 ${g.name}</strong>
                <br><span style="font-size:11px;color:#888;">${g.lines.join(", ")}</span>
              </td>
              <td style="padding:14px 0;border-bottom:1px solid #f4f1ec;text-align:center;font-size:13px;color:#555;vertical-align:top;">×${g.boxes}</td>
              <td style="padding:14px 0;border-bottom:1px solid #f4f1ec;text-align:right;font-size:14px;color:#1a1a1a;font-weight:600;vertical-align:top;">₦${(g.price * g.boxes).toLocaleString()}</td>
            </tr>`).join("");
          })()}
        </tbody>
      </table>
    </div>

    <!-- ── BILL SUMMARY ── -->
    <div style="background:#fff;padding:0 24px 24px;border-left:1px solid #ece6dc;border-right:1px solid #ece6dc;">
      <div style="background:#f9f6f0;border-radius:12px;padding:18px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:13px;color:#666;">Subtotal</td>
              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;">₦${order.subtotal.toLocaleString()}</td></tr>
          ${order.discountTotal ? `<tr><td style="padding:4px 0;font-size:13px;color:#10b981;">Discount${order.couponCode ? ` (${order.couponCode})` : ""}</td>
              <td style="padding:4px 0;font-size:13px;color:#10b981;text-align:right;">-₦${order.discountTotal.toLocaleString()}</td></tr>` : ""}
          <tr><td style="padding:4px 0;font-size:13px;color:#666;">Delivery</td>
              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;">${(order.deliveryFee ?? order.shipping) === 0 ? "Free" : `₦${(order.deliveryFee ?? order.shipping).toLocaleString()}`}</td></tr>
          ${order.packagingFee ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">Premium Packaging</td>
              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;">₦${order.packagingFee.toLocaleString()}</td></tr>` : ""}
          ${order.prepFee ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">Prep Fee</td>
              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;">₦${order.prepFee.toLocaleString()}</td></tr>` : ""}
          ${order.processingFee ? `<tr><td style="padding:4px 0;font-size:13px;color:#666;">Processing Fee</td>
              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;">₦${order.processingFee.toLocaleString()}</td></tr>` : ""}
          <tr><td colspan="2" style="padding:10px 0 0 0;"><div style="border-top:2px solid #ece6dc;"></div></td></tr>
          <tr>
            <td style="padding:10px 0 0 0;font-size:16px;color:#1a1a1a;font-weight:700;">Total ${isPaid ? "Paid" : "Due"}</td>
            <td style="padding:10px 0 0 0;font-size:22px;color:#C0392B;text-align:right;font-weight:700;">₦${order.total.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      ${isPaid ? `
      <div style="margin-top:14px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:12px 16px;text-align:center;">
        <p style="font-size:13px;color:#047857;margin:0;font-weight:600;">✅ Payment received via Paystack</p>
        ${order.paystackReference ? `<p style="font-size:11px;color:#065f46;margin:4px 0 0 0;font-family:'SF Mono',Menlo,monospace;">Ref: ${order.paystackReference}</p>` : ""}
      </div>` : `
      <div style="margin-top:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;text-align:center;">
        <p style="font-size:13px;color:#92400e;margin:0;font-weight:600;">⏳ Awaiting payment confirmation</p>
        <p style="font-size:11px;color:#a16207;margin:4px 0 0 0;">If you've paid, we'll detect it shortly. Otherwise, click the link in your previous email to retry.</p>
      </div>`}
    </div>

    <!-- ── CTA BUTTONS ── -->
    <div style="background:#fff;padding:0 24px 28px;border-left:1px solid #ece6dc;border-right:1px solid #ece6dc;text-align:center;">
      <a href="${trackUrl}" style="display:inline-block;background:#1A1A1A;border-bottom:4px solid #C0392B;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:28px;margin:4px;">
        📦 Track My Order
      </a>
      <br>
      <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I have a question about my order ${order.id}.`)}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 26px;border-radius:24px;margin:6px 4px 0;">
        💬 Question? Chat on WhatsApp
      </a>
    </div>

    <!-- ── TRUST FOOTER ── -->
    <div style="background:#fff;padding:0 24px 28px;border-left:1px solid #ece6dc;border-right:1px solid #ece6dc;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece6dc;padding-top:20px;">
        <tr>
          <td align="center" style="width:50%;padding:14px 6px;vertical-align:top;">
            <div style="font-size:22px;line-height:1;margin-bottom:6px;">❄️</div>
            <p style="font-size:11px;color:#555;font-weight:600;margin:0 0 2px 0;">Cold-Chain Sealed</p>
            <p style="font-size:10px;color:#999;margin:0;line-height:1.4;">From butcher to door, never broken.</p>
          </td>
          <td align="center" style="width:50%;padding:14px 6px;vertical-align:top;">
            <div style="font-size:22px;line-height:1;margin-bottom:6px;">⏱️</div>
            <p style="font-size:11px;color:#555;font-weight:600;margin:0 0 2px 0;">Lagos On-Time</p>
            <p style="font-size:10px;color:#999;margin:0;line-height:1.4;">Scheduled deliveries, every time.</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- ── BOTTOM FOOTER ── -->
    <div style="background:#1A1A1A;border-radius:0 0 18px 18px;padding:24px 28px;text-align:center;color:#fff;">
      <p style="font-size:13px;color:#C8955A;margin:0 0 6px 0;font-weight:600;letter-spacing:1px;">FROM OUR BUTCHERY TO YOUR TABLE</p>
      <p style="font-size:11px;color:#888;margin:0 0 14px 0;line-height:1.6;">
        Questions, changes, or feedback? Reply to this email or message us on WhatsApp — we read every one.
      </p>
      <p style="font-size:11px;color:#666;margin:14px 0 0 0;">
        ${SITE_NAME} · Premium Meat Delivery · Lagos<br>
        <a href="${SITE_URL}" style="color:#C8955A;text-decoration:none;">${SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
      </p>
      <p style="font-size:10px;color:#444;margin:12px 0 0 0;">
        You're receiving this because you placed an order with us. We never share your details.
      </p>
    </div>

  </div>
</body>
</html>`;
}

function buildAdminNotificationHtml(order: Order): string {
  const a = order.shippingAddress;
  const paymentInfo = order.paymentStatus === "payment_confirmed"
    ? `<p style="color: #16a34a; font-weight: 600;">✅ Paid via Paystack${order.paystackReference ? ` · Ref <span style="font-family:monospace;">${order.paystackReference}</span>` : ""}</p>`
    : `<p style="color: #d97706; font-weight: 600;">⏳ Payment pending (Paystack)${order.paystackReference ? ` · Ref <span style="font-family:monospace;">${order.paystackReference}</span>` : ""}</p>`;

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
        ${order.items.map(i => `<li>${i.product.name}${i.variant ? ` (${i.variant.name})` : ""} ×${i.quantity} — ₦${((i.variant?.price || i.product.price) * i.quantity).toLocaleString()}${i.selectedPrepOptions && i.selectedPrepOptions.length > 0 ? `<br><span style="font-size: 12px; color: #92400e;">Prep: ${i.selectedPrepOptions.map(p => p.label).join(", ")}</span>` : ""}</li>`).join("")}
      </ul>
      <hr style="border: none; border-top: 1px solid #f3f0f7; margin: 16px 0;">
      <p><strong>Subtotal:</strong> ₦${order.subtotal.toLocaleString()}</p>
      ${order.discountTotal ? `<p style="color: #10b981;"><strong>Coupon Discount${order.couponCode ? ` (${order.couponCode})` : ''}:</strong> -₦${order.discountTotal.toLocaleString()}</p>` : ''}
      <p><strong>Delivery Fee:</strong> ${(order.deliveryFee ?? order.shipping) === 0 ? 'Free' : `₦${(order.deliveryFee ?? order.shipping).toLocaleString()}`}</p>
      ${order.packagingFee ? `<p><strong>Premium Packaging:</strong> ₦${order.packagingFee.toLocaleString()}</p>` : ''}
      ${order.prepFee ? `<p><strong>Prep Fee:</strong> ₦${order.prepFee.toLocaleString()}</p>` : ''}
      ${order.processingFee ? `<p><strong>Processing Fee:</strong> ₦${order.processingFee.toLocaleString()}</p>` : ''}
      ${order.prepInstructions ? `<p style="color: #92400e;"><strong>Prep Instructions:</strong> ${order.prepInstructions}</p>` : ''}
      ${order.requestedDeliveryDate ? `<p><strong>Preferred Delivery:</strong> ${order.requestedDeliveryDate}${order.requestedDeliverySlot ? ` (${order.requestedDeliverySlot})` : ''}</p>` : ''}
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

// ── Payment Approved Email (legacy — kept for historical bank-transfer orders) ──
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
  } catch (error) {
    console.error("❌ Payment approved email failed:", error);
  }
}

// ── Refund Processed Email ──
export async function sendRefundProcessedEmail(
  order: Order,
  amountNaira: number,
  isFullRefund: boolean,
): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;
  const firstName = order.shippingAddress?.firstName || order.customerName.split(" ")[0];

  const html = buildStatusEmailHtml({
    firstName,
    orderId: order.id,
    total: order.total,
    emoji: "💸",
    title: isFullRefund ? "Refund Processed" : "Partial Refund Processed",
    accentColor: "#8b5cf6",
    accentBg: "#f5f3ff",
    message: `We've processed a${isFullRefund ? " full" : " partial"} refund of ₦${amountNaira.toLocaleString()} via Paystack. Funds will arrive in your account within 10 business days.`,
    statusLabel: isFullRefund ? "Refunded" : "Partially Refunded",
    nextStep: "If you have any questions about this refund, just reply to this email.",
  });

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: order.email,
      subject: `💸 ${isFullRefund ? "Refund" : "Partial Refund"} Processed — ${order.id}`,
      html,
    });
  } catch (error) {
    console.error("❌ Refund email failed:", error);
  }
}

// ── Underpayment Email (customer paid less than expected; we auto-refunded) ──
export async function sendUnderpaymentEmail(
  order: Order,
  paidNaira: number,
  expectedNaira: number,
  resumeUrl: string | null,
): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;
  const firstName = order.shippingAddress?.firstName || order.customerName.split(" ")[0];
  const shortNaira = expectedNaira - paidNaira;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8f7fa;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1A1A1A;border-bottom:4px solid #C0392B;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="color:white;font-size:28px;letter-spacing:4px;margin:0;">${SITE_NAME}</h1>
      <p style="color:#C8955A;margin-top:4px;font-size:12px;">Payment Issue</p>
    </div>
    <div style="background:white;padding:32px;border:1px solid #f3f0f7;">
      <p style="font-size:16px;color:#1a1a2e;margin:0 0 4px 0;">Hi ${firstName},</p>
      <p style="font-size:14px;color:#666;margin:0 0 20px 0;line-height:1.6;">
        We received your payment for order <strong style="font-family:monospace;color:#1a1a2e;">${order.id}</strong>, but the amount was short of the total. To keep things simple, we've automatically refunded what you paid — your card will see ₦${paidNaira.toLocaleString()} back within 10 business days.
      </p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:20px 0;">
        <table role="presentation" width="100%">
          <tr><td style="font-size:13px;color:#92400e;padding:4px 0;">You paid</td>
              <td style="font-size:13px;color:#92400e;padding:4px 0;text-align:right;font-weight:600;">₦${paidNaira.toLocaleString()}</td></tr>
          <tr><td style="font-size:13px;color:#92400e;padding:4px 0;">Order total</td>
              <td style="font-size:13px;color:#92400e;padding:4px 0;text-align:right;font-weight:600;">₦${expectedNaira.toLocaleString()}</td></tr>
          <tr><td colspan="2" style="border-top:1px solid #fde68a;padding-top:6px;"></td></tr>
          <tr><td style="font-size:14px;color:#92400e;padding:4px 0;font-weight:700;">Shortfall (refunded)</td>
              <td style="font-size:14px;color:#92400e;padding:4px 0;text-align:right;font-weight:700;">₦${shortNaira.toLocaleString()}</td></tr>
        </table>
      </div>

      <p style="font-size:14px;color:#1a1a2e;margin:16px 0;">
        Your order is on hold until full payment is received. If you'd like to complete the order, click below to pay the full amount.
      </p>

      ${resumeUrl ? `
      <div style="text-align:center;margin:24px 0;">
        <a href="${resumeUrl}" style="display:inline-block;background:#1A1A1A;border-bottom:4px solid #C0392B;color:white;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:25px;">
          Complete Payment →
        </a>
      </div>` : ""}

      <p style="font-size:12px;color:#888;text-align:center;margin-top:24px;">
        Questions? Reply to this email or message us on WhatsApp.
      </p>
    </div>
    <div style="background:#f8f7fa;border-radius:0 0 16px 16px;padding:18px;text-align:center;border:1px solid #f3f0f7;border-top:none;">
      <p style="font-size:11px;color:#aaa;margin:0;">From the ${SITE_NAME} team — we're here to help.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: order.email,
      subject: `Payment short — refunded · Order ${order.id}`,
      html,
    });
  } catch (error) {
    console.error("❌ Underpayment email failed:", error);
  }
}

// ── Dispute Alert (admin) — fired when Paystack opens a chargeback dispute ──
export async function sendDisputeAlertEmail(args: {
  reference: string;
  orderId: string | null;
  customerEmail: string;
  amountNaira: number;
  category: string;
  reason: string | null;
  dueAt: string | null;
  paystackDisputeId: number;
}): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;
  const due = args.dueAt ? new Date(args.dueAt).toLocaleString("en-NG", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not specified";
  const detailUrl = args.orderId
    ? `${SITE_URL.replace(/\/$/, "")}/admin/payments/${encodeURIComponent(args.reference)}`
    : `${SITE_URL.replace(/\/$/, "")}/admin/disputes`;

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#fef2f2;">
  <div style="max-width:560px;margin:0 auto;background:white;border:2px solid #dc2626;border-radius:14px;overflow:hidden;">
    <div style="background:#dc2626;padding:20px 24px;color:white;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:2px;font-weight:700;opacity:0.85;">🚨 Urgent · Action Required</p>
      <h2 style="margin:6px 0 0;font-size:20px;font-weight:700;">Chargeback Dispute Opened</h2>
    </div>
    <div style="padding:24px;font-size:14px;color:#1a1a2e;line-height:1.6;">
      <p style="margin:0 0 16px 0;">A customer has filed a dispute with their bank. You need to respond before the deadline or the chargeback is automatically lost.</p>

      <table role="presentation" width="100%" style="font-size:13px;">
        <tr><td style="color:#666;padding:6px 0;width:35%;">Order</td>
            <td style="padding:6px 0;font-family:monospace;font-weight:600;">${args.orderId || "—"}</td></tr>
        <tr><td style="color:#666;padding:6px 0;">Payment ref</td>
            <td style="padding:6px 0;font-family:monospace;font-size:11px;">${args.reference}</td></tr>
        <tr><td style="color:#666;padding:6px 0;">Customer</td>
            <td style="padding:6px 0;">${args.customerEmail}</td></tr>
        <tr><td style="color:#666;padding:6px 0;">Amount disputed</td>
            <td style="padding:6px 0;font-weight:700;">₦${args.amountNaira.toLocaleString()}</td></tr>
        <tr><td style="color:#666;padding:6px 0;">Category</td>
            <td style="padding:6px 0;">${args.category}</td></tr>
        ${args.reason ? `<tr><td style="color:#666;padding:6px 0;">Reason</td><td style="padding:6px 0;">${args.reason}</td></tr>` : ""}
        <tr><td style="color:#666;padding:6px 0;">Paystack Dispute ID</td>
            <td style="padding:6px 0;font-family:monospace;">${args.paystackDisputeId}</td></tr>
        <tr><td style="color:#dc2626;padding:6px 0;font-weight:600;">Deadline</td>
            <td style="padding:6px 0;color:#dc2626;font-weight:700;">${due}</td></tr>
      </table>

      <div style="text-align:center;margin:24px 0 8px;">
        <a href="${detailUrl}" style="display:inline-block;background:#dc2626;color:white;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:24px;">
          Review in Admin
        </a>
        <br>
        <a href="https://dashboard.paystack.com/#/disputes" style="display:inline-block;margin-top:10px;color:#666;text-decoration:underline;font-size:12px;">
          Open Paystack Dashboard →
        </a>
      </div>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-top:20px;">
        <p style="font-size:11px;color:#7f1d1d;margin:0;line-height:1.6;">
          <strong>Next step:</strong> Upload evidence (proof of delivery, customer comms, receipts) in the Paystack dashboard before the deadline. If you don't respond, the funds are automatically debited from your settlement.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME} Alerts" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: SITE_EMAIL,
      subject: `🚨 Chargeback opened — ₦${args.amountNaira.toLocaleString()} · ${args.orderId || args.reference}`,
      html,
    });
  } catch (error) {
    console.error("❌ Dispute alert email failed:", error);
  }
}

// ── Resume Payment Email (sent by reconcile cron for abandoned/pending checkouts) ──
export async function sendResumePaymentEmail(
  order: Order,
  resumeToken: string,
  amountNaira: number,
): Promise<void> {
  if (!process.env.SMTP_PASSWORD) return;
  const firstName = order.shippingAddress?.firstName || order.customerName.split(" ")[0];
  const resumeUrl = `${SITE_URL.replace(/\/$/, "")}/checkout/resume?token=${encodeURIComponent(resumeToken)}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8f7fa;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1A1A1A;border-bottom:4px solid #C0392B;border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <h1 style="color:white;font-size:28px;letter-spacing:4px;margin:0;">${SITE_NAME}</h1>
      <p style="color:#C8955A;margin-top:4px;font-size:12px;">Your order is waiting for you</p>
    </div>
    <div style="background:white;padding:32px;border:1px solid #f3f0f7;">
      <p style="font-size:16px;color:#1a1a2e;margin:0 0 4px 0;">Hi ${firstName},</p>
      <p style="font-size:14px;color:#666;margin:0 0 20px 0;line-height:1.55;">
        We noticed your order <strong style="font-family:monospace;color:#1a1a2e;">${order.id}</strong> didn't complete payment. Your cuts are still reserved for you — finish checkout in one click below.
      </p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:0;font-size:13px;color:#92400e;font-weight:600;">Amount due: ₦${amountNaira.toLocaleString()}</p>
        <p style="margin:6px 0 0 0;font-size:12px;color:#a16207;">Secure payment via Paystack — card, bank transfer, USSD, QR.</p>
      </div>

      <div style="text-align:center;margin:28px 0;">
        <a href="${resumeUrl}" style="display:inline-block;background:#1A1A1A;border-bottom:4px solid #C0392B;color:white;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:25px;">
          Complete Your Payment →
        </a>
      </div>

      <p style="font-size:11px;color:#aaa;margin:16px 0 0 0;text-align:center;">
        If you've already paid, just click the link — we'll detect it and confirm your order.
      </p>
    </div>
    <div style="background:#f8f7fa;border-radius:0 0 16px 16px;padding:18px;text-align:center;border:1px solid #f3f0f7;border-top:none;">
      <p style="font-size:11px;color:#aaa;margin:0;">
        This link is unique to your order and will expire when payment is complete.
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to: order.email,
      subject: `Complete your ${SITE_NAME} order — ${order.id}`,
      html,
    });
  } catch (error) {
    console.error("❌ Resume payment email failed:", error);
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
    message: "Your fresh cuts have arrived! We hope every bite is as premium as you deserve.",
    statusLabel: "Delivered",
    nextStep: "Store your meats properly for maximum freshness. Questions about your order? We're just a message away. Thank you for choosing Zúta Ya! 🥩",
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
        <a href="${SITE_URL}/shop" style="display: inline-block; background: #C0392B; color: white; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 25px;">🔄 Reorder via Our Shop</a>
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
        <div style="display: inline-block; width: 72px; height: 72px; line-height: 72px; font-size: 36px; background: #355E3B20; border-radius: 50%; text-align: center;">
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
      <div style="display:inline-block;width:72px;height:72px;line-height:72px;font-size:36px;background:#355E3B20;border-radius:50%;">🚚</div>
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

// ── Back-in-Stock Notification ──
export async function sendBackInStockEmail(
  to: string,
  product: { name: string; slug: string; image?: string | null; priceLabel?: string },
  variantName?: string | null
): Promise<void> {
  if (!process.env.SMTP_PASSWORD || !to) return;

  const title = variantName ? `${product.name} — ${variantName}` : product.name;
  const productUrl = `${SITE_URL}/product/${product.slug}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f7fa;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <div style="background:#1A1A1A;border-bottom:4px solid #1E8449; border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; font-size: 28px; letter-spacing: 4px; margin: 0 0 4px 0;">${SITE_NAME}</h1>
      <p style="font-family:Arial,sans-serif;font-size:12px;color:#C8955A;margin-top:4px;">Back In Stock</p>
    </div>

    <div style="background: white; padding: 32px; border-left: 1px solid #f3f0f7; border-right: 1px solid #f3f0f7;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; font-size: 32px; background: #d5f5e3; border-radius: 50%; text-align: center;">✅</div>
      </div>

      <h2 style="font-size: 22px; color: #1a1a2e; text-align: center; margin: 0 0 12px 0;">It's Back!</h2>
      <p style="font-size: 15px; color: #666; margin: 0 0 20px 0; line-height: 1.6; text-align: center;">
        Good news — <strong style="color:#1a1a2e;">${title}</strong> is back in stock. It sells fast, so grab yours before it's gone again.
      </p>

      ${product.image ? `<div style="text-align:center;margin-bottom:20px;"><img src="${product.image}" alt="${title}" style="max-width:280px;width:100%;border-radius:12px;" /></div>` : ""}

      ${product.priceLabel ? `<p style="font-size:18px;font-weight:700;color:#1E8449;text-align:center;margin:0 0 20px 0;">${product.priceLabel}</p>` : ""}

      <div style="text-align: center;">
        <a href="${productUrl}" style="display: inline-block; background: #C0392B; color: white; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 36px; border-radius: 25px;">🛒 Order Now</a>
      </div>
    </div>

    <div style="background: #f8f7fa; border-radius: 0 0 16px 16px; padding: 24px; text-align: center; border: 1px solid #f3f0f7; border-top: none;">
      <p style="font-size: 12px; color: #999; margin: 0 0 4px 0;">You asked to be notified when this item returned.</p>
      <p style="font-size: 12px; color: #ccc; margin: 0;">The ${SITE_NAME} Team</p>
    </div>

  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${process.env.SMTP_EMAIL || SITE_EMAIL}>`,
      to,
      subject: `✅ Back in stock: ${title} | ${SITE_NAME}`,
      html,
    });
  } catch (error) {
    console.error("❌ Back-in-stock email failed:", error);
  }
}
