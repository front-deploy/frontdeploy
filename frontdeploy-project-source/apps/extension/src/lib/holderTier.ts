export type Tier = "none" | "base" | "plus" | "founding";

export type ProFeature = 
  | "kolAlerts" 
  | "smartFollowers" 
  | "deployerIntel" 
  | "rugScan" 
  | "axiomOverlay" 
  | "firstAccess";

const TIER_BASE = process.env.PLASMO_PUBLIC_TIER_BASE ? parseInt(process.env.PLASMO_PUBLIC_TIER_BASE, 10) : 2_500_000;
const TIER_PLUS = process.env.PLASMO_PUBLIC_TIER_PLUS ? parseInt(process.env.PLASMO_PUBLIC_TIER_PLUS, 10) : 5_000_000;
const TIER_FOUNDING = process.env.PLASMO_PUBLIC_TIER_FOUNDING ? parseInt(process.env.PLASMO_PUBLIC_TIER_FOUNDING, 10) : 10_000_000;

export const FEATURE_MIN_TIER: Record<ProFeature, Tier> = {
  kolAlerts: "base",
  smartFollowers: "base",
  deployerIntel: "plus",
  rugScan: "plus",
  axiomOverlay: "plus",
  firstAccess: "founding"
};

const TIER_LEVELS: Record<Tier, number> = {
  none: 0,
  base: 1,
  plus: 2,
  founding: 3
};

/**
 * Resolves the user's tier based on their $FDP balance.
 * 
 * Note: If the backend supports Founding enrollment, the extension 
 * should also verify whether the user got enrolled before July 20th 
 * to display the actual 'Founding' badge. But for feature gating 
 * purely by balance, reaching the founding balance grants 'firstAccess' features.
 */
export function resolveTier(fdpBalance: number): Tier {
  if (fdpBalance >= TIER_FOUNDING) return "founding";
  if (fdpBalance >= TIER_PLUS) return "plus";
  if (fdpBalance >= TIER_BASE) return "base";
  return "none";
}

/**
 * Checks if a user at a given tier has access to a specific feature.
 */
export function hasAccess(userTier: Tier, feature: ProFeature): boolean {
  const minTierRequired = FEATURE_MIN_TIER[feature];
  return TIER_LEVELS[userTier] >= TIER_LEVELS[minTierRequired];
}

/**
 * Returns the minimum balance required for a specific tier.
 */
export function getTierMinBalance(tier: Tier): number {
  switch (tier) {
    case "founding": return TIER_FOUNDING;
    case "plus": return TIER_PLUS;
    case "base": return TIER_BASE;
    default: return 0;
  }
}
