-- ═══════════════════════════════════════════════════════════════════
-- 033 — Privacy Policy + Terms of Service CMS pages
-- Seeds published pages at /privacy-policy and /terms-of-service
-- (pages table → app/[slug]). Editable at /admin/pages, auto-listed in
-- the sitemap. Idempotent (ON CONFLICT re-upserts).
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO pages (slug, title, content, is_published)
VALUES (
    'privacy-policy',
    'Privacy Policy',
    to_jsonb($html$
<p><em>Last updated: 9 July 2026</em></p>

<p>Zúta Ya ("we", "us", "our") is committed to protecting your privacy. This policy explains what personal information we collect when you use our website and services, how we use it, and the choices you have. By using our site you agree to this policy.</p>

<h2>1. Information we collect</h2>
<ul>
    <li><strong>Details you give us:</strong> name, email address, phone number, and delivery address when you place an order, create an account, or subscribe to our newsletter.</li>
    <li><strong>Order information:</strong> the items you buy, order history, and delivery preferences.</li>
    <li><strong>Payment information:</strong> payments are processed securely by our payment provider (Paystack). We do not store your full card details on our servers.</li>
    <li><strong>Usage data:</strong> basic technical information such as your device, browser, and pages visited, collected to keep the site secure and working well.</li>
</ul>

<h2>2. How we use your information</h2>
<ul>
    <li>To process and deliver your orders and manage your account.</li>
    <li>To communicate with you about orders, deliveries, and support enquiries.</li>
    <li>To send you marketing or newsletter emails where you have opted in (you can unsubscribe at any time).</li>
    <li>To improve our products, service, and website, and to prevent fraud.</li>
</ul>

<h2>3. Sharing your information</h2>
<p>We do not sell your personal information. We share it only with trusted providers who help us run our business — for example our payment processor, delivery partners, and email provider — and only as needed to deliver our service, or where required by law.</p>

<h2>4. Data retention</h2>
<p>We keep your information only for as long as necessary to provide our service, meet legal and accounting obligations, and resolve disputes. You may ask us to delete your data where we are not required to keep it.</p>

<h2>5. Your rights</h2>
<p>You may request access to, correction of, or deletion of your personal information, and you may withdraw consent to marketing at any time. To exercise these rights, contact us using the details below.</p>

<h2>6. Cookies</h2>
<p>We use essential cookies and similar technologies to keep your cart, session, and preferences working. You can control cookies through your browser settings, though some features may not work without them.</p>

<h2>7. Security</h2>
<p>We use appropriate technical and organisational measures to protect your information. No method of transmission over the internet is completely secure, but we work to safeguard your data.</p>

<h2>8. Changes to this policy</h2>
<p>We may update this policy from time to time. The "last updated" date above shows when it was last revised. Significant changes will be posted on this page.</p>

<h2>9. Contact us</h2>
<p>For any privacy questions or requests, contact us at <a href="mailto:enquiry@zutayang.com">enquiry@zutayang.com</a> or <a href="https://wa.me/2347042038491">+234 704 203 8491</a>.</p>
$html$::text),
    true
),
(
    'terms-of-service',
    'Terms of Service',
    to_jsonb($html$
<p><em>Last updated: 9 July 2026</em></p>

<p>These Terms of Service ("Terms") govern your use of the Zúta Ya website and your purchase of our products and services. By placing an order or using our site, you agree to these Terms.</p>

<h2>1. About us</h2>
<p>Zúta Ya is a premium meat delivery and butchery-services business operating in Lagos, Nigeria. You can reach us at <a href="mailto:enquiry@zutayang.com">enquiry@zutayang.com</a> or <a href="https://wa.me/2347042038491">+234 704 203 8491</a>.</p>

<h2>2. Orders</h2>
<p>When you place an order you make an offer to buy the selected products at the listed price. An order is confirmed once payment is received and we accept it. We may decline or cancel an order — for example if an item is unavailable or a pricing error occurs — and will refund any payment made in that case.</p>

<h2>3. Pricing and payment</h2>
<p>All prices are shown in Nigerian Naira (₦) and may include a delivery fee and processing fee shown at checkout. Prices are subject to change. Payment is made securely through our payment provider (Paystack). Products are sold by weight or unit as indicated (for example, per kilogram).</p>

<h2>4. Delivery</h2>
<p>We deliver within our listed Lagos areas. Delivery fees and estimated timelines are shown at checkout and depend on your location. We are not liable for delays caused by circumstances outside our reasonable control. Please ensure someone is available to receive perishable goods.</p>

<h2>5. Returns and refunds</h2>
<p>Because our products are perishable, returns and refund claims are governed by our <a href="/return-policy">Return &amp; Refund Policy</a>. In summary, quality issues must be reported within 3 hours of delivery; returns are not accepted after that window. Please read the full policy for details.</p>

<h2>6. Product information</h2>
<p>We take care to describe our products accurately, but images are for illustration and natural products may vary in size, weight, and appearance. Weights are approximate and cut to order where applicable.</p>

<h2>7. Acceptable use</h2>
<p>You agree to use our site lawfully and not to misuse it, attempt to disrupt it, or access it in an unauthorised way. Accounts and content are provided for your personal, non-commercial use.</p>

<h2>8. Intellectual property</h2>
<p>All content on this site — including text, images, logos, and branding — belongs to Zúta Ya or its licensors and may not be copied or used without permission.</p>

<h2>9. Limitation of liability</h2>
<p>To the fullest extent permitted by law, our liability for any claim arising from your use of our site or products is limited to the amount you paid for the relevant order. Nothing in these Terms excludes liability that cannot be excluded under applicable law.</p>

<h2>10. Governing law</h2>
<p>These Terms are governed by the laws of the Federal Republic of Nigeria, and any disputes are subject to the jurisdiction of its courts.</p>

<h2>11. Changes to these Terms</h2>
<p>We may update these Terms from time to time. The "last updated" date shows the latest revision. Continued use of the site means you accept the updated Terms.</p>

<h2>12. Contact us</h2>
<p>Questions about these Terms? Contact us at <a href="mailto:enquiry@zutayang.com">enquiry@zutayang.com</a> or <a href="https://wa.me/2347042038491">+234 704 203 8491</a>.</p>
$html$::text),
    true
)
ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title,
        content = EXCLUDED.content,
        is_published = true,
        updated_at = now();
