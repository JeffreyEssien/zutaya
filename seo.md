Here is a universal, production-ready SEO.md file tailored specifically for e-commerce. It uses standard Markdown syntax so it will render perfectly in GitHub, GitLab, Notion, or any internal documentation repository.
------------------------------
## E-Commerce SEO Playbook
This document establishes the universal technical, architectural, and on-page SEO standards required to maximize search visibility, product discoverability, and organic conversions.
## 🚀 Core Web Vitals & Performance
Site speed directly dictates e-commerce conversion rates and search rankings.
## Performance Targets

* Largest Contentful Paint (LCP): Under 2.5 seconds (main product image/banner loads fast).
* Interaction to Next Paint (INP): Under 200 milliseconds (smooth cart and checkout interactions).
* Cumulative Layout Shift (CLS): Under 0.1 (no shifting elements during page load).

## E-Commerce Technical Checklist

* HTTPS: Enforce SSL across the entire domain, especially checkout funnels.
* Crawl Budget Management: Use robots.txt to block low-value pages like /cart, /checkout, /account, and internal search result pages (?q=).
* Canonicalization: Apply self-referencing canonical tags to base products to prevent duplicate content from tracking parameters or filters (e.g., ?color=blue).
* Sitemaps: Maintain a dynamic sitemap.xml splitting products, categories, and blog posts.

------------------------------
## 🛍️ Site Architecture & Faceted Navigation
A logical structure helps search engines crawl the site and index profitable keywords.
## Hierarchy Rules

* Structure: Keep a shallow hierarchy. Every product should be accessible within 3 clicks from the homepage (Home > Category > Sub-Category > Product).
* Breadcrumbs: Implement structured breadcrumbs on all category and product pages.
* Faceted Search Control: Prevent indexing of infinite combinations of filters (size, price, color) using noindex tags or canonicalizing them back to the main category page.

------------------------------
## 📝 On-Page E-Commerce Framework
Every catalog asset must follow these strict structural guidelines.
## Category Pages (PLPs)

* Title Tag: 50–60 characters. Format: Buy [Category Name] Online | Brand Name.
* H1 Tag: Exactly one per page, matching the main category name.
* Introductory Content: 50–100 words of optimized context above or below the product grid to establish keyword relevance.

## Product Pages (PDPs)

* Title Tag: 50–60 characters. Format: [Product Name] - [Brand/Model] | Brand Name.
* Meta Description: 110–130 characters. Include price, shipping incentives, and a transactional CTA (e.g., "Shop now").
* Product Descriptions: Avoid manufacturer boilerplates. Write unique, feature-benefit copy rich in long-tail keywords.
* Image Alt Text: Format as [Product Name] in [Color/Angle/Variant]. Use WebP or AVIF formats.

------------------------------
## 🤖 E-Commerce Rich Snippets (Structured Data)
Structured data generates star ratings, pricing, and stock status directly in Google search results. Inject this JSON-LD format into the <head> of product pages.

{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Example Product Name",
  "image": [
    "https://example.com"
  ],
  "description": "Clear, keyword-rich product description goes here.",
  "sku": "0446310786",
  "mpn": "925872",
  "brand": {
    "@type": "Brand",
    "name": "Manufacturer Brand"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com",
    "priceCurrency": "USD",
    "price": "29.99",
    "priceValidUntil": "2027-12-31",
    "itemCondition": "https://schema.orgNewCondition",
    "availability": "https://schema.orgInStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "89"
  }
}

------------------------------
## 🛑 Out-of-Stock & Seasonal Product Strategy
Improper handling of expired products destroys accumulated backlink authority.

* Permanently Discontinued: Return a 410 Gone HTTP status, or 301 redirect the URL to the closest relevant replacement product.
* Temporarily Out of Stock: Keep the page active, maintain the URL, display clear text showing when it will return, and offer an email signup for stock alerts. Do not remove structured data markup.
* Seasonal Pages: Keep seasonal URLs (e.g., /black-friday) live year-round. Leave them unlinked in navigation during off-seasons, but don't delete them.

------------------------------
If you want, I can expand this document. Let me know if you would like me to:
Add a section for Shopify-specific optimization stepsAdd a section for WooCommerce-specific optimization stepsCreate an SEO content brief template for your writers to use when adding new products

