/**
 * Plans are now fixed-fee only. No multiplier needed.
 */
export function getPlanoMultiplier(_plano: string | null | undefined): number {
  return 1.0;
}
