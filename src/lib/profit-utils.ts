/**
 * Calculates agency profit: simple valor_final - custo.
 */
export function calcularLucroReal(
  valorFinal: number,
  valorCusto: number,
  _plano?: string | null | undefined
): number {
  return Math.max(valorFinal - valorCusto, 0);
}

/**
 * No embedded tax — all plans are fixed-fee now.
 */
export function getTaxaEmbutida(
  _valorFinal: number,
  _plano?: string | null | undefined
): number {
  return 0;
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
