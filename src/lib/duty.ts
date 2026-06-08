/**
 * UK Alcohol Duty calculation (beer) — MVP.
 *
 * Rates effective 1 February 2026 (RPI uprating, Budget 2025). £ per litre of
 * pure alcohol (LPA). Source: gov.uk "Alcohol Duty rates" / "Alcohol Duty uprating".
 *
 * Duty point: in Hopper, duty is recorded when a batch is PACKAGED into a product
 * (the point beer is removed/released for consumption). Duty = LPA × rate, where
 * LPA = packaged volume × ABV%. "Draught Relief" applies a reduced rate to
 * qualifying draught products (kegs/casks, container capacity ≥ 20 litres).
 *
 * NOT tax advice. SPR is modelled as a single configurable discount (see below),
 * not the full HMRC taper. Verify rates and your eligibility with HMRC.
 */

export const DUTY_RATES_EFFECTIVE = "2026-02-01";
export const DRAUGHT_MIN_CONTAINER_LITRES = 20;

/**
 * Small Producer Relief discount applied to the base rate, as a percentage.
 * Real SPR is a tapered reduced rate based on your previous year's production
 * (eligible if < 4,500 hL of pure alcohol/year). For this MVP set a single
 * effective discount here (0 = no relief). Adjust to your HMRC figure.
 */
export const SPR_DISCOUNT_PCT = 0;

// £ per litre of pure alcohol, by ABV band, effective 2026-02-01.
const RATE_BELOW_3_5 = 9.96;
const RATE_MID_STANDARD = 22.58; // 3.5% to < 8.5%
const RATE_MID_DRAUGHT = 19.45; // 3.5% to < 8.5%, qualifying draught
const RATE_8_5_TO_22 = 30.62;

/** Package types that qualify as draught (container capacity ≥ 20 L). */
const DRAUGHT_PACKAGE_TYPES = ["KEG", "CASK", "DRAFT"];

export function isDraughtPackage(packageType: string): boolean {
  return DRAUGHT_PACKAGE_TYPES.includes(packageType);
}

/** Base £/LPA rate before any Small Producer Relief. */
export function ratePerLpa(abv: number, draught: boolean): number {
  if (abv < 1.2) return 0; // below the duty threshold — not an "alcoholic product"
  if (abv < 3.5) return RATE_BELOW_3_5; // (sub-3.5% draught relief not modelled in MVP)
  if (abv < 8.5) return draught ? RATE_MID_DRAUGHT : RATE_MID_STANDARD;
  if (abv <= 22) return RATE_8_5_TO_22;
  return RATE_8_5_TO_22; // > 22% ABV is out of scope for beer
}

export type DutyCalc = {
  lpaPerUnit: number;
  lpaTotal: number;
  baseRate: number;
  effectiveRate: number;
  dutyPerUnit: number;
  dutyAmount: number;
};

export function calcDuty(params: {
  abv: number;
  volumePerUnitL: number;
  units: number;
  draught: boolean;
  sprDiscountPct?: number;
}): DutyCalc {
  const { abv, volumePerUnitL, units, draught, sprDiscountPct = 0 } = params;
  const lpaPerUnit = volumePerUnitL * (abv / 100);
  const lpaTotal = lpaPerUnit * units;
  const baseRate = ratePerLpa(abv, draught);
  const effectiveRate = baseRate * (1 - sprDiscountPct / 100);
  return {
    lpaPerUnit,
    lpaTotal,
    baseRate,
    effectiveRate,
    dutyPerUnit: lpaPerUnit * effectiveRate,
    dutyAmount: lpaTotal * effectiveRate,
  };
}
