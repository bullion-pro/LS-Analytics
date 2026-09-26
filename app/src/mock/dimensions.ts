/** Static dimension tables — the "who/where/what" every fact table joins against. */

export interface Branch {
  id: string;
  name: string;
  city: string;
  weight: number; // relative revenue share
}

export const BRANCHES: Branch[] = [
  { id: "br-dxb-mall", name: "Dubai Mall Boutique", city: "Dubai", weight: 0.38 },
  { id: "br-dxb-gold", name: "Deira Gold Souq", city: "Dubai", weight: 0.24 },
  { id: "br-auh-corn", name: "Abu Dhabi Corniche", city: "Abu Dhabi", weight: 0.22 },
  { id: "br-shj-city", name: "Sharjah City Centre", city: "Sharjah", weight: 0.16 },
];

export const ORGANIZATION = {
  id: "org-luxury-shoppe",
  name: "Luxury Shoppe",
  baseCurrency: "AED",
};

export const CURRENT_USER = {
  name: "Khalid Al Rashid",
  role: "Admin",
  initials: "KR",
};

export interface Division {
  id: string;
  name: string;
  weight: number;
}

export const DIVISIONS: Division[] = [
  { id: "div-jewellery", name: "Jewellery", weight: 0.72 },
  { id: "div-watches", name: "Watches", weight: 0.15 },
  { id: "div-bags", name: "Bags", weight: 0.08 },
  { id: "div-perfume", name: "Perfume", weight: 0.05 },
];

export interface Category {
  id: string;
  name: string;
  divisionId: string;
  weight: number;
}

export const CATEGORIES: Category[] = [
  { id: "cat-rings", name: "Rings", divisionId: "div-jewellery", weight: 0.26 },
  { id: "cat-necklaces", name: "Necklaces", divisionId: "div-jewellery", weight: 0.22 },
  { id: "cat-earrings", name: "Earrings", divisionId: "div-jewellery", weight: 0.16 },
  { id: "cat-bangles", name: "Bangles", divisionId: "div-jewellery", weight: 0.15 },
  { id: "cat-bracelets", name: "Bracelets", divisionId: "div-jewellery", weight: 0.12 },
  { id: "cat-pendants", name: "Pendants", divisionId: "div-jewellery", weight: 0.09 },
  { id: "cat-watches", name: "Watches", divisionId: "div-watches", weight: 1 },
  { id: "cat-bags", name: "Bags", divisionId: "div-bags", weight: 1 },
  { id: "cat-perfume", name: "Perfume", divisionId: "div-perfume", weight: 1 },
];

export interface Brand {
  id: string;
  name: string;
  weight: number; // share of jewellery-division revenue
}

/** Branded jewellery lines carried by Luxury Shoppe — a designer-brand split of the same
 *  jewellery revenue `CATEGORIES` splits by item type, not a separate revenue pool. */
export const BRANDS: Brand[] = [
  { id: "brand-bijouq", name: "Bijouq", weight: 0.22 },
  { id: "brand-palmyra", name: "Palmyra", weight: 0.17 },
  { id: "brand-luca-carati", name: "Luca Carati", weight: 0.15 },
  { id: "brand-carlo-barberis", name: "Carlo Barberis", weight: 0.13 },
  { id: "brand-cashmere", name: "Cashmere", weight: 0.11 },
  { id: "brand-giloro", name: "Giloro", weight: 0.09 },
  { id: "brand-j-jewels", name: "J Jewels", weight: 0.08 },
  { id: "brand-noi-gioielli", name: "Noi Gioielli", weight: 0.05 },
];

export interface MetalType {
  id: string;
  name: string;
  purity: string;
  weight: number; // share of jewellery-division revenue
}

export const METAL_TYPES: MetalType[] = [
  { id: "metal-au24", name: "Gold", purity: "24K", weight: 0.18 },
  { id: "metal-au22", name: "Gold", purity: "22K", weight: 0.42 },
  { id: "metal-au18", name: "Gold", purity: "18K", weight: 0.24 },
  { id: "metal-pt", name: "Platinum", purity: "950", weight: 0.08 },
  { id: "metal-ag", name: "Silver", purity: "925", weight: 0.08 },
];

export interface Salesman {
  id: string;
  name: string;
  branchId: string;
  monthlyTargetAED: number;
}

const SALES_NAMES = [
  "Amina Al Farsi",
  "Rohan Kapoor",
  "Farah Haddad",
  "Vikram Nair",
  "Leila Mansour",
  "Omar El-Sayed",
  "Priya Menon",
  "Yousef Al Marri",
  "Nadia Saleh",
  "Arjun Reddy",
  "Hana Khalil",
  "Karan Malhotra",
];

export const SALESMEN: Salesman[] = SALES_NAMES.map((name, i) => ({
  id: `sm-${i + 1}`,
  name,
  branchId: BRANCHES[i % BRANCHES.length].id,
  monthlyTargetAED: 16_500 + (i % 5) * 2_000,
}));

export type SupplierCategory = "Bullion" | "Gemstone" | "Finished Goods" | "Packaging";

export interface Supplier {
  id: string;
  name: string;
  category: SupplierCategory;
  currency: "AED" | "USD" | "INR" | "HKD";
  paymentTermsDays: number;
  weight: number; // relative spend share
}

export const SUPPLIERS: Supplier[] = [
  { id: "sup-1", name: "Al Etihad Bullion Trading", category: "Bullion", currency: "AED", paymentTermsDays: 15, weight: 0.24 },
  { id: "sup-2", name: "Emirates Gold Refinery", category: "Bullion", currency: "AED", paymentTermsDays: 30, weight: 0.18 },
  { id: "sup-3", name: "Surat Diamond Exports", category: "Gemstone", currency: "USD", paymentTermsDays: 45, weight: 0.15 },
  { id: "sup-4", name: "Antwerp Stone House", category: "Gemstone", currency: "USD", paymentTermsDays: 60, weight: 0.11 },
  { id: "sup-5", name: "Mumbai Fine Jewellery Works", category: "Finished Goods", currency: "INR", paymentTermsDays: 30, weight: 0.13 },
  { id: "sup-6", name: "Hong Kong Atelier Crafts", category: "Finished Goods", currency: "HKD", paymentTermsDays: 45, weight: 0.1 },
  { id: "sup-7", name: "Levant Pearl & Co.", category: "Gemstone", currency: "AED", paymentTermsDays: 30, weight: 0.05 },
  { id: "sup-8", name: "Al Wasl Display & Packaging", category: "Packaging", currency: "AED", paymentTermsDays: 30, weight: 0.04 },
];

export function pctOfYear(monthIndex0to11: number): number {
  return monthIndex0to11 / 12;
}
