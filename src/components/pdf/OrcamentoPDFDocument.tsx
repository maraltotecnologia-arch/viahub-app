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

const formatarFormaPagamento = (forma: string | null | undefined): string => {
  if (!forma) return "Não informada";
  const mapa: Record<string, string> = {
    avista: "À Vista",
    a_vista: "À Vista",
    credito: "Crédito",
    credit: "Crédito",
    debito: "Débito",
    debit: "Débito",
    pix: "PIX",
  };
  return mapa[forma.toLowerCase()] ?? forma;
};

const s = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 72,
    paddingLeft: 48,
    paddingRight: 48,
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
    borderBottomWidth: 3,
    borderBottomColor: "#1E3A8A",
    borderBottomStyle: "solid",
    paddingBottom: 16,
    marginBottom: 24,
  },
  agencyName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1E3A8A",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  contactText: {
    fontSize: 10,
    color: "#374151",
  },
  logo: {
    width: 80,
    height: 40,
    marginBottom: 4,
  },
  // Title
  titleText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E3A8A",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 24,
  },
  // A/C section
  acSection: {
    marginBottom: 32,
  },
  acLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 4,
  },
  clientName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
  },
  clientDetail: {
    fontSize: 11,
    color: "#374151",
  },
  // Table
  tableContainer: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#1E3A8A",
    borderBottomStyle: "solid",
    paddingBottom: 8,
    marginBottom: 4,
  },
  thService: {
    width: "25%",
    fontSize: 11,
    fontWeight: "bold",
    color: "#1E3A8A",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  thDescription: {
    width: "55%",
    fontSize: 11,
    fontWeight: "bold",
    color: "#1E3A8A",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  thValue: {
    width: "20%",
    fontSize: 11,
    fontWeight: "bold",
    color: "#1E3A8A",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    borderBottomStyle: "solid",
    paddingTop: 10,
    paddingBottom: 10,
  },
  tdService: {
    width: "25%",
    fontSize: 12,
    color: "#111827",
  },
  tdDescription: {
    width: "55%",
    fontSize: 11,
    color: "#374151",
  },
  tdValue: {
    width: "20%",
    fontSize: 12,
    color: "#111827",
    textAlign: "right",
  },
  // Total
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  totalBox: {
    backgroundColor: "#1E3A8A",
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 24,
    paddingRight: 24,
  },
  totalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 0.5,
  },
  // Divider
  divider: {
    height: 3,
    backgroundColor: "#2563EB",
    width: 48,
    marginTop: 32,
    marginBottom: 12,
    alignSelf: "center",
  },
  // Payment / Terms
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1E3A8A",
    textAlign: "center",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
    marginBottom: 16,
  },
  termsValue: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
  },
  observacoes: {
    fontSize: 11,
    color: "#374151",
    textAlign: "center",
    marginTop: 4,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderTopStyle: "solid",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
  },
});

interface Props {
  data: OrcamentoPDFData;
}

const OrcamentoPDFDocument: React.FC<Props> = ({ data }) => {
  const { orcamento, cliente, itens, agencia } = data;
  const total = itens.reduce((sum, i) => sum + (Number(i.valor_final) || 0), 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* HEADER */}
        <View style={s.header}>
          <View>
            {agencia.logo_url && (
              <Image src={agencia.logo_url} style={s.logo} />
            )}
            <Text style={s.agencyName}>{agencia.nome_fantasia}</Text>
          </View>
          <View style={s.headerRight}>
            {agencia.telefone && (
              <Text style={s.contactText}>{agencia.telefone}</Text>
            )}
            {agencia.email && (
              <Text style={s.contactText}>{agencia.email}</Text>
            )}
          </View>
        </View>

        {/* TÍTULO */}
        <Text style={s.titleText}>
          ORÇAMENTO #{orcamento.numero_orcamento || "—"}
        </Text>
        <Text style={s.dateText}>
          Data: {fmtDate(orcamento.criado_em)}
        </Text>

        {/* A/C */}
        <View style={s.acSection}>
          <Text style={s.acLabel}>A/C:</Text>
          <Text style={s.clientName}>{cliente?.nome || "-"}</Text>
          {cliente?.email && (
            <Text style={s.clientDetail}>{cliente.email}</Text>
          )}
          {cliente?.telefone && (
            <Text style={s.clientDetail}>{cliente.telefone}</Text>
          )}
        </View>

        {/* TABLE */}
        <View style={s.tableContainer}>
          <View style={s.tableHeader}>
            <Text style={s.thService}>Serviço</Text>
            <Text style={s.thDescription}>Descrição</Text>
            <Text style={s.thValue}>Valor</Text>
          </View>
          {itens.map((item, idx) => (
            <View key={idx} style={s.tableRow}>
              <Text style={s.tdService}>
                {item.tipo}
                {(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}
              </Text>
              <Text style={s.tdDescription}>{item.descricao || "-"}</Text>
              <Text style={s.tdValue}>
                {fmt(Number(item.valor_final) || 0)}
              </Text>
            </View>
          ))}
        </View>

        {/* TOTAL */}
        <View style={s.totalRow}>
          <View style={s.totalBox}>
            <Text style={s.totalText}>
              TOTAL: {fmt(Number(orcamento.valor_final) || total)}
            </Text>
          </View>
        </View>

        {/* DIVIDER */}
        <View style={s.divider} />

        {/* FORMA DE PAGAMENTO */}
        <Text style={s.sectionTitle}>FORMA DE PAGAMENTO</Text>
        <Text style={s.sectionValue}>
          {formatarFormaPagamento(orcamento.forma_pagamento)}
        </Text>

        {/* DIVIDER 2 */}
        <View style={s.divider} />

        {/* TERMOS */}
        <Text style={s.sectionTitle}>TERMOS E CONDIÇÕES</Text>
        {orcamento.validade && (
          <Text style={s.termsValue}>
            Este orçamento é válido até {fmtDate(orcamento.validade)}
          </Text>
        )}
        {orcamento.observacoes && (
          <Text style={s.observacoes}>{orcamento.observacoes}</Text>
        )}

        {/* FOOTER */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {agencia.nome_fantasia}
            {agencia.email ? ` · ${agencia.email}` : ""}
            {agencia.telefone ? ` · ${agencia.telefone}` : ""}
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
