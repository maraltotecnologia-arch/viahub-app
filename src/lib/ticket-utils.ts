/**
 * Generates a visual ticket ID from priority and ticket number
 * Example: Priority "Alta" + number 10005 -> "A#10005"
 * Example: Priority "Baixa" + number 10120 -> "B#10120"
 */
export function getTicketVisualId(prioridade: string, ticketNumber: number | bigint): string {
  const firstLetter = prioridade?.trim()?.charAt(0)?.toUpperCase() || 'X';
  return `${firstLetter}#${ticketNumber}`;
}
