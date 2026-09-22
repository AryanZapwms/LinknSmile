// lib/mou-content.ts
//
// Single source of truth for the Vendor MOU (Memorandum of Understanding)
// text and its version. Bump CURRENT_MOU_VERSION whenever the business
// terms below change — every vendor (new and existing) is then required to
// re-accept before they can use their vendor panel again. See
// lib/models/vendor-mou-acceptance.ts for the acceptance audit trail and
// app/vendor/mou/page.tsx for the acceptance flow.

// ─── Business terms — edit these, not the prose below ──────────────────────

export const COMPANY_NAME = "LinknSmile";

/** Annual, non-refundable vendor registration fee, in INR. */
export const REGISTRATION_FEE_INR = 1800;

/**
 * Flat commission rate on the *whole* order value (not tiered/marginal) —
 * whichever slab the order total falls into applies to the entire order.
 */
export const COMMISSION_SLABS: { min: number; max: number | null; ratePercent: number }[] = [
  { min: 1, max: 5000, ratePercent: 1 },
  { min: 5001, max: 10000, ratePercent: 2 },
  { min: 10001, max: 20000, ratePercent: 3 },
  { min: 20001, max: 35000, ratePercent: 4 },
  { min: 35001, max: 50000, ratePercent: 5 },
  { min: 50001, max: null, ratePercent: 7 },
];

/** MOU term length, in years. Auto-renews on registration-fee payment. */
export const MOU_TERM_YEARS = 1;

/** Notice period (days) either party must give to terminate without cause. */
export const TERMINATION_NOTICE_DAYS = 30;

export const GOVERNING_LAW = "India";

// ─── Version ────────────────────────────────────────────────────────────────

/**
 * Bump this (semver-style) on any change to the terms below. A vendor's
 * acceptance is keyed to this exact string (see VendorMouAcceptance), so
 * bumping it immediately requires re-acceptance from every vendor, past
 * acceptances included — nothing else needs to change to roll that out.
 */
export const CURRENT_MOU_VERSION = "1.0.0";

// ─── Rendering ──────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatCommissionSlabsTable(): string {
  const rows = COMMISSION_SLABS.map((slab) => {
    const range =
      slab.max === null
        ? `${formatINR(slab.min)} and above`
        : `${formatINR(slab.min)} – ${formatINR(slab.max)}`;
    return `| ${range} | ${slab.ratePercent}% |`;
  });
  return ["| Order Value | Commission Rate |", "| --- | --- |", ...rows].join("\n");
}

export interface MouInterpolationParams {
  vendorName: string;
  vendorId: string;
  shopName?: string;
  /** Defaults to now. Pass the acceptance date when re-rendering an already-accepted MOU. */
  date?: Date;
}

/**
 * Renders the current MOU as markdown, with the vendor's name/ID/shop and
 * a date interpolated into the preamble. Same text for every vendor other
 * than that interpolation — this is not a per-vendor negotiated document.
 */
export function getMouMarkdown({
  vendorName,
  vendorId,
  shopName,
  date = new Date(),
}: MouInterpolationParams): string {
  const formattedDate = date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `# Vendor Memorandum of Understanding

**Version:** ${CURRENT_MOU_VERSION}
**Date:** ${formattedDate}
**Vendor:** ${vendorName} (Vendor ID: ${vendorId})${shopName ? `\n**Shop:** ${shopName}` : ""}

This Memorandum of Understanding ("MOU") is entered into between **${COMPANY_NAME}** ("Company", "we", "us") and the vendor identified above ("Vendor", "you"), and governs the Vendor's use of the Company's e-commerce platform to list, sell, and fulfil products ("Platform").

By checking the acceptance box and clicking "I Agree", you confirm that you have read, understood, and agree to be bound by this MOU in full.

## 1. Registration Fee

The Vendor shall pay an annual, **non-refundable** registration fee of **${formatINR(REGISTRATION_FEE_INR)}** to access and use the Platform. This fee is renewed annually and is due again at the start of each subsequent term described in Section 6.

## 2. Commission Structure

The Company charges commission on every order fulfilled through the Platform, calculated as a **flat rate on the entire order value** (not a marginal/tiered calculation) according to the slab the order falls into:

${formatCommissionSlabsTable()}

Example: an order worth ${formatINR(22000)} falls in the ${formatINR(20001)}–${formatINR(35000)} slab and is charged at a flat 4% on the full ${formatINR(22000)}, not a blend of the lower slabs' rates.

## 3. Marketing and Promotion

The Company will, at its sole discretion, undertake marketing and promotional activities for the Platform and the products listed on it. The Company does not guarantee any specific level of visibility, traffic, sales, or results from these activities, and the Vendor acknowledges that participation in the Platform is not conditioned on any guaranteed outcome.

## 4. Packaging, Logistics, and Delivery

The Vendor is solely responsible for the packaging, logistics, delivery, and handling of returns for all products sold through the Platform, including ensuring that products reach customers in a timely and undamaged condition. The Company is not liable for losses arising from the Vendor's packaging, shipping, delivery, or returns handling.

## 5. Vendor Obligations

The Vendor agrees to:

- Maintain accurate, complete, and lawful product listings at all times, including pricing, descriptions, and images;
- Maintain sufficient stock to fulfil orders placed through the Platform, and promptly update availability;
- Comply with all applicable laws, including GST and other tax obligations, and applicable consumer protection law;
- Not take any action to circumvent the Platform — including but not limited to redirecting customers off-platform — in order to avoid paying commission on a sale sourced from the Platform.

## 6. Term and Renewal

This MOU is effective for a term of ${MOU_TERM_YEARS} year from the date of acceptance and automatically renews for successive ${MOU_TERM_YEARS}-year terms upon payment of the annual registration fee described in Section 1.

## 7. Termination

Either party may terminate this MOU for convenience by giving the other party at least **${TERMINATION_NOTICE_DAYS} days' written notice**. The Company may terminate this MOU **immediately and without notice** in the event of a breach of this MOU by the Vendor, or in the event of suspected fraud, illegal activity, or conduct that harms the Platform, its customers, or other vendors.

No fees paid under Section 1 are refundable upon termination, for any reason. Any commission accrued on orders placed prior to termination remains payable by the Vendor to the Company.

## 8. Relationship of the Parties

The Vendor is an independent seller operating its own business. Nothing in this MOU creates an employment relationship, partnership, joint venture, or agency relationship between the Company and the Vendor.

## 9. Confidentiality

Each party agrees to keep confidential any non-public business, technical, or financial information disclosed by the other party in connection with this MOU, and not to disclose it to third parties except as required by law or to perform its obligations under this MOU.

## 10. Limitation of Liability

To the maximum extent permitted by law, neither party shall be liable to the other for any indirect, incidental, special, or consequential damages arising out of or relating to this MOU. Each party's liability arising from this MOU is limited to direct damages actually incurred.

## 11. Governing Law

This MOU is governed by, and shall be construed in accordance with, the laws of ${GOVERNING_LAW}, without regard to conflict-of-law principles.

## 12. Acceptance

By checking the box and clicking "I Agree" below, ${vendorName} confirms acceptance of this MOU (version ${CURRENT_MOU_VERSION}) on ${formattedDate}.`;
}
