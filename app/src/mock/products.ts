import { createRng } from "./rng";

/**
 * Concrete, named product line templates — the texture layer on top of the
 * category-level rollups. Shared by Sales (recent invoices) and Inventory
 * (aged SKU highlights) so the same jewellery vocabulary shows up
 * consistently wherever an individual line item appears, grounded in actual
 * UAE retail jewellery product naming (karat, stone weight, piece type)
 * rather than generic "Product A/B/C" placeholders.
 */
export interface ProductTemplate {
  name: string;
  priceRangeAED: [number, number];
  weightRangeG?: [number, number];
}

export const PRODUCT_TEMPLATES: Record<string, ProductTemplate[]> = {
  "cat-rings": [
    { name: "18K Gold Solitaire Ring, 0.75ct Diamond", priceRangeAED: [12500, 38000], weightRangeG: [3.2, 6.8] },
    { name: "22K Gold Engagement Ring Set", priceRangeAED: [8500, 21000], weightRangeG: [6.5, 13.4] },
    { name: "Platinum Diamond Eternity Band", priceRangeAED: [15500, 44000], weightRangeG: [4.1, 7.9] },
  ],
  "cat-necklaces": [
    { name: "22K Gold Bridal Necklace Set", priceRangeAED: [29000, 94000], weightRangeG: [52, 118] },
    { name: "18K Gold Diamond Tennis Necklace", priceRangeAED: [36000, 119000], weightRangeG: [18, 34] },
    { name: "21K Gold Choker", priceRangeAED: [14200, 31500], weightRangeG: [28, 46] },
  ],
  "cat-earrings": [
    { name: "18K Gold Diamond Stud Earrings", priceRangeAED: [4600, 17800], weightRangeG: [2.1, 4.8] },
    { name: "22K Gold Jhumka Earrings", priceRangeAED: [3200, 9600], weightRangeG: [8.4, 16.2] },
  ],
  "cat-bangles": [
    { name: "22K Gold Kada Bangle Pair", priceRangeAED: [22500, 57500], weightRangeG: [64, 132] },
    { name: "18K Gold Diamond Bangle", priceRangeAED: [18200, 41500], weightRangeG: [22, 38] },
  ],
  "cat-bracelets": [
    { name: "18K Gold Tennis Bracelet, Diamond Pave", priceRangeAED: [9600, 31500], weightRangeG: [11, 19] },
    { name: "22K Gold Charm Bracelet", priceRangeAED: [4800, 12900], weightRangeG: [14, 24] },
  ],
  "cat-pendants": [
    { name: "18K Gold Solitaire Pendant, 0.5ct", priceRangeAED: [3800, 11400], weightRangeG: [1.8, 3.6] },
    { name: "22K Gold Temple Pendant", priceRangeAED: [2200, 6400], weightRangeG: [5.5, 11] },
  ],
  "cat-watches": [
    { name: "Rolex Datejust 41, Steel & Gold", priceRangeAED: [46000, 97500] },
    { name: "Cartier Santos Medium", priceRangeAED: [28500, 51500] },
    { name: "Patek Philippe Calatrava", priceRangeAED: [121000, 308000] },
  ],
  "cat-bags": [
    { name: "Hermès Constance Wallet", priceRangeAED: [5400, 8900] },
    { name: "Chanel Classic Flap, Medium", priceRangeAED: [23500, 33800] },
  ],
  "cat-perfume": [
    { name: "Amouage Interlude 100ml Gift Set", priceRangeAED: [850, 1420] },
    { name: "Creed Aventus 120ml", priceRangeAED: [1080, 1640] },
  ],
};

export interface PickedProductLine {
  templateName: string;
  priceAED: number;
  weightG?: number;
}

export function pickProductLine(rng: () => number, categoryId: string): PickedProductLine {
  const templates = PRODUCT_TEMPLATES[categoryId];
  const template = templates[Math.floor(rng() * templates.length)];
  const priceAED = Math.round(
    (template.priceRangeAED[0] + rng() * (template.priceRangeAED[1] - template.priceRangeAED[0])) / 10,
  ) * 10;
  const weightG = template.weightRangeG
    ? Math.round((template.weightRangeG[0] + rng() * (template.weightRangeG[1] - template.weightRangeG[0])) * 10) / 10
    : undefined;
  return { templateName: template.name, priceAED, weightG };
}

/** Deterministic SKU code, stable across reloads — "BNG-22140" style. */
export function skuFor(categoryId: string, seed: number): string {
  const prefixMap: Record<string, string> = {
    "cat-rings": "RNG",
    "cat-necklaces": "NCK",
    "cat-earrings": "ERR",
    "cat-bangles": "BNG",
    "cat-bracelets": "BRC",
    "cat-pendants": "PND",
    "cat-watches": "WCH",
    "cat-bags": "BAG",
    "cat-perfume": "PRF",
  };
  const rng = createRng(seed);
  const num = 10000 + Math.floor(rng() * 89999);
  return `${prefixMap[categoryId]}-${num}`;
}
