# AnimaForge Marketplace

The AnimaForge Marketplace is a community-driven store where creators can buy, sell, and share style packs, templates, characters, audio packs, and plugins.

---

## Listing Items

### What Can Be Listed

| Category | Description | File Format |
|----------|-------------|-------------|
| **Style Packs** | Color palettes, textures, lighting presets | `.animastyle` (JSON + assets) |
| **Templates** | Pre-built project structures with shots and settings | `.animatemplate` |
| **Characters** | Character definitions with reference images and embeddings | `.animachar` |
| **Audio Packs** | Music loops, SFX collections, voice presets | `.zip` (WAV/MP3) |
| **Plugins** | Extensions that add features to the platform | `.animaplugin` |

### Submission Process

1. **Prepare your item**: Ensure all assets are included and the preview images showcase the item clearly.
2. **Submit for review**: Use `POST /api/v1/marketplace/publish` or the Seller Dashboard UI.
3. **Automated checks**: The system validates file formats, scans for malware, and checks for copyright issues.
4. **Manual review**: The AnimaForge team reviews quality, originality, and policy compliance (1-3 business days).
5. **Published**: Once approved, the item appears in the marketplace and is available for purchase.

### Listing Requirements

- At least 3 preview images (1200x800 minimum, WebP or PNG)
- A clear title (max 60 characters) and description (max 2000 characters)
- Accurate categorization and tags
- No copyrighted material unless you own the rights
- Must pass the automated content moderation scan

---

## Purchasing

### Purchase Flow

1. Buyer browses or searches the marketplace.
2. Buyer clicks "Purchase" on a listing.
3. Payment is processed via Stripe (credit card, Apple Pay, Google Pay).
4. The item is immediately added to the buyer's library.
5. A receipt is sent via email.

### Pricing

- Sellers set their own prices (minimum $0.99, maximum $499.99)
- Free items are allowed (listed as "Free" with no payment step)
- Sellers can offer promotional pricing with start/end dates
- Bundle discounts are supported (buy 3+ items from the same seller)

### Refund Policy

- Full refund within 14 days if the item does not match its description
- No refund for items that have been used in a published project
- Disputes are mediated by the AnimaForge team

---

## Revenue Split

| Party | Share |
|-------|-------|
| **Seller** | 70% |
| **AnimaForge** | 30% |

The 30% platform fee covers:

- Payment processing (Stripe fees are absorbed by the platform share)
- Hosting and CDN delivery of marketplace assets
- Review and moderation of submissions
- Marketplace search, discovery, and recommendation infrastructure
- Buyer support and dispute resolution

---

## Payouts

### Schedule

- Payouts are processed on the **1st and 15th** of each month
- Minimum payout threshold: **$25.00**
- Earnings below the threshold roll over to the next payout period

### Methods

| Method | Availability | Processing Time |
|--------|-------------|-----------------|
| Stripe Connect (bank transfer) | Global | 2-5 business days |
| PayPal | Global | 1-3 business days |
| Wire transfer | Enterprise sellers | 3-7 business days |

### Tax Reporting

- Sellers are responsible for their own tax obligations
- AnimaForge issues 1099-K forms for US sellers exceeding IRS thresholds
- W-8BEN collection for international sellers
- VAT is handled by AnimaForge for EU buyers (reverse charge for B2B)

---

## Reviews and Ratings

### Rating System

- Buyers can rate purchased items from 1 to 5 stars
- Ratings include a text review (optional but encouraged)
- Reviews are visible publicly on the listing page
- Sellers can respond to reviews

### Moderation

- Reviews are scanned for profanity, spam, and abuse
- Fraudulent reviews (e.g., self-reviews, review exchanges) are detected and removed
- Sellers can report inappropriate reviews for manual moderation

### Impact on Visibility

- Higher-rated items appear higher in search results and recommendations
- Items with fewer than 3 ratings use a Bayesian average to avoid bias
- Consistently low-rated items (below 2.0 average) may be delisted after review

---

## Seller Dashboard

The Seller Dashboard provides analytics and management tools for marketplace sellers.

### Features

- **Sales overview**: Revenue, units sold, and conversion rate over time
- **Listing management**: Create, edit, unpublish, and archive listings
- **Analytics**: Views, clicks, purchases, and refund rates per listing
- **Reviews**: View and respond to buyer reviews
- **Payout history**: Past and upcoming payouts with transaction details
- **Performance alerts**: Notifications for low ratings, high refund rates, or policy violations

### Access

The Seller Dashboard is available at `https://animaforge.com/seller` for any user who has published at least one marketplace item. No separate application is required to become a seller.
