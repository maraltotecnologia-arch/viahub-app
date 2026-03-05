/**
 * Returns the silent commission multiplier based on the agency plan.
 * Plans with variable commission embed the fee into item prices.
 */
export function getPlanoMultiplier(plano: string | null | undefined): number {
  switch (plano) {
    case "starter_b":
      return 1.015; // 1.5%
    case "pro_b":
      return 1.012; // 1.2%
    default:
      return 1.0;
  }
}
