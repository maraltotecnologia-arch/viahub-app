import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { OrcamentoPDFData } from "./OrcamentoPreview";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "-";

const formatarPagamento = (forma: string | null | undefined) => {
  if (!forma) return "-";
  return ({ 'pix': 'PIX', 'credito': 'Crédito', 'debito': 'Débito', 'avista': 'À Vista', 'a_vista': 'À Vista' } as Record<string, string>)[forma.toLowerCase()] ?? forma;
};

const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  logo: { height: 50, maxWidth: 150 },
  agencyName: { fontSize: 14, fontWeight: "bold", color: "#1E3A8A" },
  contactRight: { alignItems: "flex-end" },
  contactText: { fontSize: 10, color: "#6B7280" },
  headerLine: { height: 3, backgroundColor: "#2563EB", marginTop: 16, marginBottom: 32 },
  // Title
  title: { fontSize: 24, fontWeight: "bold", color: "#1E3A8A", marginBottom: 4 },
  date: { fontSize: 11, color: "#6B7280", marginBottom: 24 },
  // A/C
  acLabel: { fontSize: 10, color: "#6B7280", marginBottom: 2 },
  acName: { fontSize: 13, fontWeight: "bold", color: "#111827", marginBottom: 2 },
  acDetail: { fontSize: 10, color: "#6B7280" },
  acSection: { marginBottom: 32 },
  // Table header
  tableHeader: { flexDirection: "row", backgroundColor: "#1E3A8A", paddingVertical: 8, paddingHorizontal: 12 },
  thService: { width: "25%", fontSize: 10, fontWeight: "bold", color: "white" },
  thDesc: { width: "55%", fontSize: 10, fontWeight: "bold", color: "white" },
  thValue: { width: "20%", fontSize: 10, fontWeight: "bold", color: "white", textAlign: "right" },
  // Table row
  tableRow: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tdService: { width: "25%", fontSize: 11, color: "#111827" },
  tdDesc: { width: "55%", fontSize: 10, color: "#6B7280" },
  tdValue: { width: "20%", fontSize: 11, color: "#111827", textAlign: "right" },
  // Total
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, marginBottom: 32 },
  totalBox: { backgroundColor: "#1E3A8A", paddingVertical: 10, paddingHorizontal: 20 },
  totalText: { fontSize: 13, fontWeight: "bold", color: "white" },
  // Conditions
  condSection: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 16, marginTop: 8 },
  condLabel: { fontSize: 10, fontWeight: "bold", color: "#1E3A8A", marginBottom: 4 },
  condValue: { fontSize: 11, color: "#374151", marginBottom: 16 },
  // Footer
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 8 },
  footerText: { fontSize: 8, color: "#9CA3AF", textAlign: "center" },
});

interface Props {
  data: OrcamentoPDFData;
}

const OrcamentoPDFDocument: React.FC<Props> = ({ data }) => {
  const { orcamento, cliente, itens, agencia, logoDims } = data;
  const total = itens.reduce((sum, i) => sum + (Number(i.valor_final) || 0), 0);
  const logoStyle = logoDims
    ? { width: logoDims.width, height: logoDims.height }
    : { height: 50, maxWidth: 150 };

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* HEADER */}
        <View style={s.header}>
          <View>
            {agencia.logo_url ? (
              <Image src={agencia.logo_url} style={logoStyle} />
            ) : (
              <Text style={s.agencyName}>{agencia.nome_fantasia || ""}</Text>
            )}
          </View>
          <View style={s.contactRight}>
            {agencia.telefone && <Text style={s.contactText}>{agencia.telefone}</Text>}
            {agencia.email && <Text style={s.contactText}>{agencia.email}</Text>}
          </View>
        </View>
        <View style={s.headerLine} />

        {/* TÍTULO */}
        <Text style={s.title}>
          ORÇAMENTO #{orcamento.numero_orcamento || ""}
        </Text>
        <Text style={s.date}>Data: {fmtDate(orcamento.criado_em)}</Text>

        {/* A/C */}
        <View style={s.acSection}>
          <Text style={s.acLabel}>Para:</Text>
          <Text style={s.acName}>{cliente?.nome || "Cliente"}</Text>
          {cliente?.email && <Text style={s.acDetail}>{cliente.email}</Text>}
          {cliente?.telefone && <Text style={s.acDetail}>{cliente.telefone}</Text>}
        </View>

        {/* TABLE */}
        <View style={s.tableHeader}>
          <Text style={s.thService}>SERVIÇO</Text>
          <Text style={s.thDesc}>DESCRIÇÃO</Text>
          <Text style={s.thValue}>VALOR</Text>
        </View>
        {itens.map((item, idx) => (
          <View key={idx} style={s.tableRow}>
            <Text style={s.tdService}>{item.tipo}</Text>
            <Text style={s.tdDesc}>{item.descricao || "-"}</Text>
            <Text style={s.tdValue}>{fmt(Number(item.valor_final) || 0)}</Text>
          </View>
        ))}

        {/* TOTAL */}
        <View style={s.totalRow}>
          <View style={s.totalBox}>
            <Text style={s.totalText}>TOTAL: {fmt(Number(orcamento.valor_final) || total)}</Text>
          </View>
        </View>

        {/* CONDITIONS */}
        <View style={s.condSection}>
          <Text style={s.condLabel}>FORMA DE PAGAMENTO</Text>
          <Text style={s.condValue}>{formatarPagamento(orcamento.forma_pagamento)}</Text>

          {orcamento.validade && (
            <>
              <Text style={s.condLabel}>VALIDADE</Text>
              <Text style={s.condValue}>{fmtDate(orcamento.validade)}</Text>
            </>
          )}

          {orcamento.observacoes && (
            <>
              <Text style={s.condLabel}>OBSERVAÇÕES</Text>
              <Text style={{ fontSize: 11, color: "#374151" }}>{orcamento.observacoes}</Text>
            </>
          )}
        </View>

        {/* FOOTER */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {agencia.nome_fantasia || ""} · {agencia.email || ""} · {agencia.telefone || ""}
          </Text>
          <Text style={s.footerText}>
            Orçamento gerado pelo ViaHub · powered by Maralto
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default OrcamentoPDFDocument;
