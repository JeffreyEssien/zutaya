-- ═══════════════════════════════════════════════════════════════════
-- 032 — Return & Refund Policy CMS page
-- Seeds a published page at /return-policy (pages table → app/[slug]).
-- Editable later at /admin/pages. content is JSONB holding an HTML string
-- (matches the render path: typeof content === "string" ? innerHTML).
-- Perishable-goods policy: quality issues must be reported within 3 hours
-- of delivery; no returns accepted after that window.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO pages (slug, title, content, is_published)
VALUES (
    'return-policy',
    'Return & Refund Policy',
    to_jsonb($html$
<p><em>Last updated: 9 July 2026</em></p>

<p>At Zúta Ya we sell fresh, perishable meat and butchery products. Because of the nature of these goods, this policy explains when a return or refund is possible, how to request one, and how long it takes. Please read it alongside our Terms of Service.</p>

<h2>1. Inspect your order on delivery</h2>
<p>We ask that you inspect your order at the point of delivery, or as soon as reasonably possible after it arrives. If anything is wrong — an item is missing, incorrect, damaged, or not of satisfactory quality — you must report it to us <strong>within 3 hours of delivery</strong>.</p>

<h2>2. Return &amp; report window</h2>
<p><strong>We do not accept returns or claims made more than 3 hours after delivery.</strong> Because our products are perishable and temperature-sensitive, we cannot verify the condition of goods once this window has passed, and reported issues after 3 hours are not eligible for a refund, replacement, or exchange.</p>

<h2>3. What is eligible</h2>
<p>Within the 3-hour window, you may report and claim for:</p>
<ul>
    <li>Items that are damaged, spoiled, or not of satisfactory quality on arrival.</li>
    <li>Incorrect items — you received something different from what you ordered.</li>
    <li>Missing items — part of your order was not delivered.</li>
</ul>
<p>To help us resolve your claim quickly, please keep the item in its original packaging and provide clear photos of the product and packaging.</p>

<h2>4. Non-returnable items</h2>
<p>For food-safety reasons, the following cannot be returned or refunded once accepted at delivery and outside the 3-hour window:</p>
<ul>
    <li>Perishable meat and butchery products that have been opened, partially used, frozen, cooked, or stored by the customer.</li>
    <li>Items reported after the 3-hour window has closed.</li>
    <li>Products damaged as a result of improper storage or handling after delivery.</li>
</ul>

<h2>5. How to make a claim</h2>
<p>Contact us within 3 hours of delivery through any of the following, quoting your order number:</p>
<ul>
    <li>Email: <a href="mailto:enquiry@zutayang.com">enquiry@zutayang.com</a></li>
    <li>WhatsApp or phone: <a href="https://wa.me/2347042038491">+234 704 203 8491</a></li>
</ul>
<p>Please include your order number, a description of the issue, and photos where relevant. Our team will review your claim and respond as quickly as possible.</p>

<h2>6. Refunds</h2>
<p>Where a claim is approved, you may choose a replacement on your next delivery or a refund. Approved refunds are issued to your <strong>original payment method</strong> via our payment processor. Once approved, refunds are typically processed within <strong>5–10 business days</strong>, depending on your bank or card provider. We will let you know by email once your refund has been initiated.</p>

<h2>7. Cancellations</h2>
<p>If you need to cancel or change an order, please contact us as soon as possible. Orders that have already been prepared, packed, or dispatched cannot be cancelled, as the goods are perishable.</p>

<h2>8. Your statutory rights</h2>
<p>Nothing in this policy affects your rights under applicable Nigerian consumer-protection law, including the Federal Competition and Consumer Protection Act. This policy is in addition to, and does not limit, those rights.</p>

<h2>9. Contact us</h2>
<p>Questions about this policy? Reach us at <a href="mailto:enquiry@zutayang.com">enquiry@zutayang.com</a> or <a href="https://wa.me/2347042038491">+234 704 203 8491</a>. We are here to help.</p>
$html$::text),
    true
)
ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title,
        content = EXCLUDED.content,
        is_published = true,
        updated_at = now();
