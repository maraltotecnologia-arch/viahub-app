import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const ITEMS_PER_PAGE = 30;

const statusColors: Record<string, string> = {
  pago: "#16A34A",
  aprovado: "#2563EB",
  emitido: "#7C3AED",
  enviado: "#0EA5E9",
  perdido: "#DC2626",
  rascunho: "#6B7280",
};

const statusLabels: Record<string, string> = {
  pago: "Pago",
  aprovado: "Aprovado",
  emitido: "Emitido",
  enviado: "Enviado",
  perdido: "Perdido",
  rascunho: "Rascunho",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#1E293B" },
  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  logo: { maxHeight: 40, maxWidth: 120 },
  agencyName: { fontSize: 14, fontWeight: "bold", color: "#1E3A8A" },
  title: { fontSize: 16, fontWeight: "bold", color: "#1E3A8A", marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#64748B", marginBottom: 2 },
  filterLine: { fontSize: 8, color: "#475569", backgroundColor: "#F1F5F9", padding: 6, borderRadius: 3, marginBottom: 12, marginTop: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0", marginVertical: 8 },
  // Cards
  cardsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  card: { flex: 1, border: "1px solid #E2E8F0", borderRadius: 4, padding: 8, backgroundColor: "#F8FAFC" },
  cardLabel: { fontSize: 7, color: "#64748B", marginBottom: 2, textTransform: "uppercase" as const },
  cardValue: { fontSize: 12, fontWeight: "bold" },
  cardValueGreen: { fontSize: 12, fontWeight: "bold", color: "#16A34A" },
  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "#1E3A8A", borderRadius: 3, paddingVertical: 5, paddingHorizontal: 4 },
  thText: { color: "#FFFFFF", fontSize: 7, fontWeight: "bold", fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: "#E2E8F0" },
  tableRowAlt: { backgroundColor: "#F8FAFC" },
  tdText: { fontSize: 8, color: "#334155" },
  // Columns
  colNum: { width: "14%" },
  colCliente: { width: "20%" },
  colTipo: { width: "18%" },
  colValor: { width: "16%", textAlign: "right" as const },
  colStatus: { width: "12%", textAlign: "center" as const },
  colData: { width: "10%" },
  // Footer
  footer: { position: "absolute" as const, bottom: 25, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, borderTopColor: "#CBD5E1", paddingTop: 6 },
  footerText: { fontSize: 9, color: "#94A3B8" },
});

export interface RelatorioPDFProps {
  agenciaNome: string;
  logoUrl?: string | null;
  logoDims?: { width: number; height: number };
  periodoLabel: string;
  dateStart: string;
  dateEnd: string;
  filtrosTexto?: string;
  faturamentoBruto: number;
  totalComissoes: number;
  ticketMedio: number;
  totalOrcamentos: number;
  totalRecebido: number;
  ticketMedioRecebido: number;
  percentConvertidoCaixa: number;
  orcamentos: {
    numero_orcamento?: string | null;
    cliente_nome: string;
    tipos_servico: string[];
    valor_final: number;
    status: string;
    criado_em?: string | null;
  }[];
}

function TableHeaderRow() {
  return (
    <View style={s.tableHeader}>
      <View style={s.colNum}><Text style={s.thText}>Nº Orçamento</Text></View>
      <View style={s.colCliente}><Text style={s.thText}>Cliente</Text></View>
      <View style={s.colTipo}><Text style={s.thText}>Tipo(s)</Text></View>
      <View style={s.colValor}><Text style={s.thText}>Valor Final</Text></View>
      <View style={s.colStatus}><Text style={s.thText}>Status</Text></View>
      <View style={s.colData}><Text style={s.thText}>Data</Text></View>
    </View>
  );
}

export default function RelatorioPDFDocument({ data }: { data: RelatorioPDFProps }) {
  const now = new Date();
  const geradoEm = `Gerado em ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const totalPages = Math.max(1, Math.ceil(data.orcamentos.length / ITEMS_PER_PAGE));
  const pages: typeof data.orcamentos[] = [];
  for (let i = 0; i < totalPages; i++) {
    pages.push(data.orcamentos.slice(i * ITEMS_PER_PAGE, (i + 1) * ITEMS_PER_PAGE));
  }

  return (
    <Document>
      {pages.map((pageItems, pageIdx) => (
        <Page key={pageIdx} size="A4" style={s.page}>
          {/* Header - only on first page */}
          {pageIdx === 0 && (
            <>
              <View style={s.headerRow}>
              <View>
                  {data.logoUrl ? (
                    <Image
                      src={data.logoUrl}
                      style={{ width: 60, height: 60, objectFit: "contain" }}
                    />
                  ) : (
                    <Text style={s.agencyName}>{data.agenciaNome}</Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" as const }}>
                  {data.logoUrl && <Text style={{ fontSize: 10, color: "#334155", marginBottom: 2 }}>{data.agenciaNome}</Text>}
                </View>
              </View>
              <Text style={s.title}>Relatório Financeiro</Text>
              <Text style={s.subtitle}>De {data.dateStart} a {data.dateEnd}</Text>
              <Text style={s.subtitle}>{geradoEm}</Text>
              {data.filtrosTexto && <Text style={s.filterLine}>Filtros: {data.filtrosTexto}</Text>}
              <View style={s.divider} />

              {/* Summary cards row 1 */}
              <View style={s.cardsRow}>
                <View style={s.card}>
                  <Text style={s.cardLabel}>Faturamento Bruto</Text>
                  <Text style={s.cardValue}>{fmt(data.faturamentoBruto)}</Text>
                </View>
                <View style={s.card}>
                  <Text style={s.cardLabel}>Lucro Bruto</Text>
                  <Text style={s.cardValue}>{fmt(data.totalComissoes)}</Text>
                </View>
                <View style={s.card}>
                  <Text style={s.cardLabel}>Ticket Médio</Text>
                  <Text style={s.cardValue}>{fmt(data.ticketMedio)}</Text>
                </View>
                <View style={s.card}>
                  <Text style={s.cardLabel}>Total de Orçamentos</Text>
                  <Text style={s.cardValue}>{String(data.totalOrcamentos)}</Text>
                </View>
              </View>

              {/* Summary cards row 2 */}
              <View style={s.cardsRow}>
                <View style={s.card}>
                  <Text style={s.cardLabel}>Total Recebido</Text>
                  <Text style={s.cardValueGreen}>{fmt(data.totalRecebido)}</Text>
                </View>
                <View style={s.card}>
                  <Text style={s.cardLabel}>Ticket Médio Recebido</Text>
                  <Text style={s.cardValue}>{fmt(data.ticketMedioRecebido)}</Text>
                </View>
                <View style={s.card}>
                  <Text style={s.cardLabel}>% Convertido em Caixa</Text>
                  <Text style={s.cardValue}>{data.percentConvertidoCaixa}%</Text>
                </View>
              </View>

              <View style={{ marginBottom: 8 }} />
            </>
          )}

          {/* Table */}
          <TableHeaderRow />
          {pageItems.map((o, idx) => {
            const globalIdx = pageIdx * ITEMS_PER_PAGE + idx;
            const isAlt = globalIdx % 2 === 0;
            const statusColor = statusColors[o.status || "rascunho"] || "#6B7280";
            const statusLabel = statusLabels[o.status || "rascunho"] || o.status;
            const dataFormatada = o.criado_em
              ? new Date(o.criado_em).toLocaleDateString("pt-BR")
              : "-";
            return (
              <View key={idx} style={[s.tableRow, isAlt ? s.tableRowAlt : {}]}>
                <View style={s.colNum}><Text style={s.tdText}>{o.numero_orcamento || "-"}</Text></View>
                <View style={s.colCliente}><Text style={s.tdText}>{o.cliente_nome}</Text></View>
                <View style={s.colTipo}><Text style={s.tdText}>{o.tipos_servico.join(", ") || "-"}</Text></View>
                <View style={s.colValor}><Text style={s.tdText}>{fmt(o.valor_final)}</Text></View>
                <View style={s.colStatus}><Text style={[s.tdText, { color: statusColor, fontFamily: "Helvetica-Bold" }]}>{statusLabel}</Text></View>
                <View style={s.colData}><Text style={s.tdText}>{dataFormatada}</Text></View>
              </View>
            );
          })}

          {/* Footer */}
          <View style={s.footer} fixed>
            <Text style={s.footerText}>
              Gerado por ViaHub · viahub.app
            </Text>
            <Text style={s.footerText}>
              Página {pageIdx + 1} de {totalPages}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
