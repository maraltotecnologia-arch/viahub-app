/**
 * Calculates the real agency profit by subtracting the embedded operational tax.
 * The tax belongs to ViaHub, not the agency.
 */
export function calcularLucroReal(
  valorFinal: number,
  valorCusto: number,
  plano: string | null | undefined
): number {
  const lucroBruto = valorFinal - valorCusto;
  const taxa = getTaxaEmbutida(valorFinal, plano);
  return Math.max(lucroBruto - taxa, 0);
}

/**
 * Returns the embedded operational tax amount for a given valor_final.
 */
export function getTaxaEmbutida(
  valorFinal: number,
  plano: string | null | undefined
): number {
  switch (plano) {
    case "starter_b":
      return valorFinal - valorFinal / 1.015;
    case "pro_b":
      return valorFinal - valorFinal / 1.012;
    default:
      return 0;
  }
}

/**
 * Checks if all items have zero markup (valor_final ≈ custo).
 */
export function isMargemZero(
  itens: Array<{ valor_custo: number | null; valor_final: number | null; markup_percentual: number | null }>
): boolean {
  if (!itens || itens.length === 0) return false;
  return itens.every((i) => {
    const markup = Number(i.markup_percentual) || 0;
    return markup === 0;
  });
}
