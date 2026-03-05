// Helper to build service date/time display strings
export function buildServiceDateInfo(item: any): string | null {
  const fmtD = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };
  const fmtH = (h: string) => (h ? h.substring(0, 5) : "");

  const tipo = (item.tipo || "").toLowerCase();

  if (tipo === "aéreo" || tipo === "aereo" || tipo === "transfer") {
    const parts: string[] = [];
    if (item.partida_data) {
      let s = `Partida: ${fmtD(item.partida_data)}`;
      if (item.partida_hora) s += ` às ${fmtH(item.partida_hora)}`;
      parts.push(s);
    }
    if (item.chegada_data) {
      let s = `Chegada: ${fmtD(item.chegada_data)}`;
      if (item.chegada_hora) s += ` às ${fmtH(item.chegada_hora)}`;
      parts.push(s);
    }
    if (parts.length === 0) return null;
    return `✈ ${parts.join(" → ")}`;
  }

  if (tipo === "hotel" || tipo === "pacote") {
    const parts: string[] = [];
    if (item.checkin_data) {
      let s = `Check-in: ${fmtD(item.checkin_data)}`;
      if (item.checkin_hora) s += ` às ${fmtH(item.checkin_hora)}`;
      parts.push(s);
    }
    if (item.checkout_data) {
      let s = `Check-out: ${fmtD(item.checkout_data)}`;
      if (item.checkout_hora) s += ` às ${fmtH(item.checkout_hora)}`;
      parts.push(s);
    }
    if (parts.length === 0) return null;
    return `🏨 ${parts.join(" | ")}`;
  }

  return null;
}
