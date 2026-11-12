/**
 * Dipperfox product data and PRELIMINARY requirements.
 *
 * Source: docs/sources/DIPPERFOX_TOOTETINGIMUSED.md — version 0.1, compiled 2026-10-29,
 * status "manufacturer technical approval pending". Nothing here is approved.
 * Every requirement keeps its own source reference; conflicting sources share a
 * conflictGroup and are NEVER merged, averaged or auto-resolved.
 */

export const DRAFT_RULE_SET = {
  version: "draft-v0.1-2026-10-29",
  description:
    "Preliminary reference values from Dipperfox public product pages (source document v0.1). Manufacturer approval pending — not certified limits.",
  sourceDocument: "docs/sources/DIPPERFOX_TOOTETINGIMUSED.md (v0.1, 2026-10-29)",
};

export const SOURCES = {
  S1: { url: "https://www.dipperfox.com/stump-grinder-sc400", title: "Dipperfox SC 400 product page" },
  S2: { url: "https://www.dipperfox.com/stump-grinder-sc600", title: "Dipperfox SC 600 product page" },
  S3: { url: "https://www.dipperfox.com/stump-grinder-sc850-pro", title: "Dipperfox SC 850 Pro product page" },
  S4: {
    url: "https://dipperfox.com/blog/case-studies-1/dipperfox-sc400-sc600-sc850-pro-comparison-305",
    title: "Dipperfox SC 400 / SC 600 / SC 850 Pro comparison (published 2026-09-30)",
  },
  S5: { url: "https://www.dipperfox.com/products", title: "Dipperfox products overview" },
  S6: { url: "https://www.dipperfox.com/", title: "Dipperfox homepage" },
} as const;
export type SourceRef = keyof typeof SOURCES;

/** Date the source document says the pages were checked. Not an approval date. */
export const SOURCE_CHECKED_AT = "2026-10-29T00:00:00.000Z";

export interface ProductSeed {
  id: "sc400" | "sc600" | "sc850pro";
  name: string;
  pageUrl: string;
  imagePath: string;
  cuttingDiameterMm: number;
  grindingDepthMm: number;
  massKg: number;
  torqueNm: number;
  suitability: string;
  sortOrder: number;
}

export const PRODUCTS: ProductSeed[] = [
  {
    id: "sc400",
    name: "SC 400",
    pageUrl: SOURCES.S1.url,
    imagePath: "/brand/sc400.webp",
    cuttingDiameterMm: 400,
    grindingDepthMm: 590,
    massKg: 190,
    torqueNm: 13700,
    suitability: "Smaller landscaping and limited-access sites",
    sortOrder: 1,
  },
  {
    id: "sc600",
    name: "SC 600",
    pageUrl: SOURCES.S2.url,
    imagePath: "/brand/sc600.webp",
    cuttingDiameterMm: 600,
    grindingDepthMm: 700,
    massKg: 320,
    torqueNm: 16900,
    suitability: "Medium-scale landscaping and site preparation",
    sortOrder: 2,
  },
  {
    id: "sc850pro",
    name: "SC 850 Pro",
    pageUrl: SOURCES.S3.url,
    imagePath: "/brand/sc850pro.webp",
    cuttingDiameterMm: 850,
    grindingDepthMm: 900,
    massKg: 580,
    torqueNm: 43000,
    suitability: "Heavier forestry and infrastructure / site clearing",
    sortOrder: 3,
  },
];

export interface RequirementSeed {
  key: string;
  productId: ProductSeed["id"];
  carrierType: string;
  parameter: string;
  min?: number | null;
  max?: number | null;
  value?: number | null;
  ruleKind: "hard_limit" | "recommended_range" | "unclassified";
  unit: string;
  status: "draft" | "conflicting";
  conflictGroup?: string;
  sourceRef: SourceRef;
  note?: string;
}

const UPPER_POWER_NOTE =
  "The published upper power bound is not a demonstrated ban on more powerful carriers (source doc §2).";
const MASS_CLASS_NOTE =
  "Classification pending: may be a permitted limit or a recommended machine class (source doc §2).";
const OTHER_SITE_NOTE =
  "From a general Dipperfox page; the carrier type the figure refers to is not stated (source doc §3).";

const R = (r: Omit<RequirementSeed, "key"> & { suffix?: string }): RequirementSeed => {
  const { suffix, ...rest } = r;
  return {
    ...rest,
    key: `v0.1:${r.productId}:${r.carrierType}:${r.parameter}:${r.sourceRef}${suffix ? `:${suffix}` : ""}`,
  };
};

export const DRAFT_REQUIREMENTS: RequirementSeed[] = [
  // ---------------- SC 400 — excavator ----------------
  R({ productId: "sc400", carrierType: "excavator", parameter: "carrier_weight_t", min: 1.5, max: 5, ruleKind: "unclassified", unit: "t", status: "conflicting", conflictGroup: "sc400:excavator:carrier_weight_t", sourceRef: "S1", note: MASS_CLASS_NOTE }),
  R({ productId: "sc400", carrierType: "excavator", parameter: "carrier_weight_t", min: 1, max: 5, ruleKind: "unclassified", unit: "t", status: "conflicting", conflictGroup: "sc400:excavator:carrier_weight_t", sourceRef: "S5", note: OTHER_SITE_NOTE }),
  R({ productId: "sc400", carrierType: "excavator", parameter: "carrier_weight_t", min: 1, max: 5, ruleKind: "unclassified", unit: "t", status: "conflicting", conflictGroup: "sc400:excavator:carrier_weight_t", sourceRef: "S6", note: OTHER_SITE_NOTE }),
  R({ productId: "sc400", carrierType: "excavator", parameter: "engine_power_kw_min", min: 12, ruleKind: "unclassified", unit: "kW", status: "conflicting", conflictGroup: "sc400:excavator:engine_power_kw_min", sourceRef: "S1" }),
  R({ productId: "sc400", carrierType: "excavator", parameter: "engine_power_kw_min", min: 35, ruleKind: "unclassified", unit: "kW", status: "conflicting", conflictGroup: "sc400:excavator:engine_power_kw_min", sourceRef: "S5", note: OTHER_SITE_NOTE }),
  R({ productId: "sc400", carrierType: "excavator", parameter: "engine_power_kw_min", min: 35, ruleKind: "unclassified", unit: "kW", status: "conflicting", conflictGroup: "sc400:excavator:engine_power_kw_min", sourceRef: "S6", note: OTHER_SITE_NOTE }),
  R({ productId: "sc400", carrierType: "excavator", parameter: "engine_power_kw_range", min: 12, max: 35, ruleKind: "unclassified", unit: "kW", status: "draft", sourceRef: "S1", note: UPPER_POWER_NOTE }),
  R({ productId: "sc400", carrierType: "excavator", parameter: "aux_flow_lpm", min: 30, max: 130, ruleKind: "unclassified", unit: "L/min", status: "draft", sourceRef: "S1" }),
  R({ productId: "sc400", carrierType: "excavator", parameter: "aux_pressure_bar", min: 110, max: 250, ruleKind: "unclassified", unit: "bar", status: "draft", sourceRef: "S1" }),
  R({ productId: "sc400", carrierType: "excavator", parameter: "tool_mass_kg", value: 190, ruleKind: "unclassified", unit: "kg", status: "draft", sourceRef: "S1", note: "Grinder mass without adapters." }),

  // ---------------- SC 400 — other carrier types (typical mass class only) ----------------
  R({ productId: "sc400", carrierType: "backhoe_loader", parameter: "carrier_weight_t", min: 3, max: 6, ruleKind: "unclassified", unit: "t", status: "draft", sourceRef: "S1", note: "Typical mass class named on the product page; subject to suitable hydraulics and mounting. No type-specific power/hydraulic limits published." }),
  R({ productId: "sc400", carrierType: "compact_loader", parameter: "carrier_weight_t", min: 1, max: 2.5, ruleKind: "unclassified", unit: "t", status: "draft", sourceRef: "S1", note: "Typical mass class named on the product page; subject to suitable hydraulics and mounting. No type-specific power/hydraulic limits published." }),
  R({ productId: "sc400", carrierType: "skid_steer", parameter: "carrier_weight_t", min: 1, max: 2.5, ruleKind: "unclassified", unit: "t", status: "draft", sourceRef: "S1", note: "Typical mass class named on the product page; subject to suitable hydraulics and mounting. No type-specific power/hydraulic limits published." }),

  // ---------------- SC 600 — excavator ----------------
  R({ productId: "sc600", carrierType: "excavator", parameter: "carrier_weight_t", min: 6, max: 12, ruleKind: "unclassified", unit: "t", status: "conflicting", conflictGroup: "sc600:excavator:carrier_weight_t", sourceRef: "S2", note: MASS_CLASS_NOTE }),
  R({ productId: "sc600", carrierType: "excavator", parameter: "carrier_weight_t", min: 2, max: 14, ruleKind: "unclassified", unit: "t", status: "conflicting", conflictGroup: "sc600:excavator:carrier_weight_t", sourceRef: "S6", note: "Homepage range; may cover several carrier types (source doc §3)." }),
  R({ productId: "sc600", carrierType: "excavator", parameter: "engine_power_kw_min", min: 35, ruleKind: "unclassified", unit: "kW", status: "draft", sourceRef: "S2" }),
  R({ productId: "sc600", carrierType: "excavator", parameter: "engine_power_kw_range", min: 35, max: 74, ruleKind: "unclassified", unit: "kW", status: "draft", sourceRef: "S2", note: UPPER_POWER_NOTE }),
  R({ productId: "sc600", carrierType: "excavator", parameter: "aux_flow_lpm", min: 65, max: 150, ruleKind: "unclassified", unit: "L/min", status: "draft", sourceRef: "S2" }),
  R({ productId: "sc600", carrierType: "excavator", parameter: "aux_pressure_bar", min: 150, max: 250, ruleKind: "unclassified", unit: "bar", status: "draft", sourceRef: "S2" }),
  R({ productId: "sc600", carrierType: "excavator", parameter: "tool_mass_kg", value: 320, ruleKind: "unclassified", unit: "kg", status: "draft", sourceRef: "S2", note: "Grinder mass without adapters." }),

  // ---------------- SC 850 Pro — excavator ----------------
  R({ productId: "sc850pro", carrierType: "excavator", parameter: "carrier_weight_t", min: 13, max: 30, ruleKind: "unclassified", unit: "t", status: "conflicting", conflictGroup: "sc850pro:excavator:carrier_weight_t", sourceRef: "S3", note: MASS_CLASS_NOTE }),
  R({ productId: "sc850pro", carrierType: "excavator", parameter: "carrier_weight_t", min: 14, max: 30, ruleKind: "unclassified", unit: "t", status: "conflicting", conflictGroup: "sc850pro:excavator:carrier_weight_t", sourceRef: "S6", note: "Homepage range; minimum and product version to be confirmed (source doc §3)." }),
  R({ productId: "sc850pro", carrierType: "excavator", parameter: "engine_power_kw_min", min: 74, ruleKind: "unclassified", unit: "kW", status: "draft", sourceRef: "S3" }),
  R({ productId: "sc850pro", carrierType: "excavator", parameter: "engine_power_kw_range", min: 74, max: 130, ruleKind: "unclassified", unit: "kW", status: "draft", sourceRef: "S3", note: UPPER_POWER_NOTE }),
  R({ productId: "sc850pro", carrierType: "excavator", parameter: "aux_flow_lpm", min: 110, max: 230, ruleKind: "unclassified", unit: "L/min", status: "draft", sourceRef: "S3" }),
  R({ productId: "sc850pro", carrierType: "excavator", parameter: "aux_pressure_bar", min: 180, max: 350, ruleKind: "unclassified", unit: "bar", status: "draft", sourceRef: "S3" }),
  R({ productId: "sc850pro", carrierType: "excavator", parameter: "tool_mass_kg", value: 580, ruleKind: "unclassified", unit: "kg", status: "draft", sourceRef: "S3", note: "Grinder mass without adapters. Long-reach excavators need a working-position stability check (S3)." }),
];
