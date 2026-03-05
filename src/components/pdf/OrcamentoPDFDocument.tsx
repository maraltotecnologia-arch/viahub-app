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

const AZUL_ESCURO = "#1B3FA0";
const AZUL_MEDIO = "#2563EB";

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
    alignItems: "flex-start",
    marginBottom: 20,
    position: "relative",
    zIndex: 1,
  },
  headerLeft: {},
  logo: { height: 50, maxWidth: 150 },
  agencyName: { fontSize: 14, fontWeight: "bold", color: AZUL_ESCURO },
  // Decorative header - top right
  decoHeaderBig: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 80,
    height: 120,
    backgroundColor: AZUL_ESCURO,
    opacity: 0.15,
    borderRadius: 8,
  },
  decoHeaderSmall: {
    position: "absolute",
    top: -30,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: AZUL_MEDIO,
    opacity: 0.2,
    borderRadius: 8,
  },
  // Decorative header - top left
  decoHeaderTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 120,
    height: 6,
    backgroundColor: AZUL_MEDIO,
  },
  decoHeaderLeftVert: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 4,
    height: 80,
    backgroundColor: AZUL_ESCURO,
    opacity: 0.3,
  },
  // Title
  title: { fontSize: 22, fontWeight: "bold", color: AZUL_ESCURO, marginBottom: 4 },
  date: { fontSize: 10, fontWeight: "bold", color: AZUL_MEDIO, marginBottom: 24 },
  // Dados do Solicitante
  solicitanteSection: { marginBottom: 24 },
  solicitanteTitle: { fontSize: 11, fontWeight: "bold", color: AZUL_ESCURO, marginBottom: 8 },
  solicitanteLine: { fontSize: 10, color: "#374151", marginBottom: 4 },
  solicitanteLabel: { fontWeight: "bold" },
  // Table
  tableWrapper: { borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 0 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: AZUL_ESCURO,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  thService: { width: "20%", fontSize: 10, fontWeight: "bold", color: "white" },
  thDesc: { width: "60%", fontSize: 10, fontWeight: "bold", color: "white" },
  thValue: { width: "20%", fontSize: 10, fontWeight: "bold", color: "white", textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tdService: { width: "20%", fontSize: 10, color: "#111827" },
  tdDesc: { width: "60%", fontSize: 10, color: "#374151", flexDirection: "column" as const },
  tdValue: { width: "20%", fontSize: 10, color: "#111827", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    backgroundColor: AZUL_ESCURO,
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: "flex-end",
  },
  totalText: { fontSize: 11, fontWeight: "bold", color: "white" },
  // Footer below table (condições)
  tableFooter: { marginTop: 20 },
  decoLine: { width: 60, height: 3, backgroundColor: AZUL_MEDIO, marginBottom: 12 },
  condLabel: { fontSize: 10, fontWeight: "bold", color: AZUL_ESCURO, marginBottom: 4 },
  condValue: { fontSize: 10, color: "#374151", marginBottom: 12 },
  // Final footer (fixed, all pages)
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center",
    zIndex: 1,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
    paddingBottom: 20,
    marginTop: 8,
    marginBottom: 0,
  },
  footerLine1: { fontSize: 7.5, color: "#64748B", marginBottom: 4, textAlign: "center" },
  footerLine2: { fontSize: 8, color: "#374151", fontWeight: "bold", marginBottom: 4, textAlign: "center" },
  footerLine3: { fontSize: 7.5, color: "#94A3B8", marginBottom: 2, textAlign: "center" },
  // Linha decorativa acima do rodapé (wrapper para centralizar)
  decoFooterLineWrapper: { alignItems: "center" as const, marginTop: 24, marginBottom: 8 },
  decoFooterLine: {
    width: 200,
    height: 3,
    backgroundColor: AZUL_MEDIO,
    opacity: 0.3,
  },
  // Linhas decorativas rodapé - canto inferior esquerdo
  decoFootLeftHorz: {
    position: "absolute",
    bottom: 32,
    left: 0,
    width: 80,
    height: 5,
    backgroundColor: AZUL_ESCURO,
  },
  decoFootLeftVert: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 5,
    height: 80,
    backgroundColor: AZUL_ESCURO,
  },
  decoFootLeftAccentHorz: {
    position: "absolute",
    bottom: 22,
    left: 0,
    width: 45,
    height: 2,
    backgroundColor: AZUL_MEDIO,
    opacity: 0.6,
  },
  decoFootLeftAccentVert: {
    position: "absolute",
    bottom: 0,
    left: 8,
    width: 2,
    height: 50,
    backgroundColor: AZUL_MEDIO,
    opacity: 0.6,
  },
  // Linhas decorativas rodapé - canto inferior direito
  decoFootRightHorz: {
    position: "absolute",
    bottom: 32,
    right: 0,
    width: 80,
    height: 5,
    backgroundColor: AZUL_ESCURO,
  },
  decoFootRightVert: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 5,
    height: 80,
    backgroundColor: AZUL_ESCURO,
  },
  decoFootRightAccentHorz: {
    position: "absolute",
    bottom: 22,
    right: 0,
    width: 45,
    height: 2,
    backgroundColor: AZUL_MEDIO,
    opacity: 0.6,
  },
  decoFootRightAccentVert: {
    position: "absolute",
    bottom: 0,
    right: 8,
    width: 2,
    height: 50,
    backgroundColor: AZUL_MEDIO,
    opacity: 0.6,
  },
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
        {/* Decorative header - top right */}
        <View style={s.decoHeaderBig} />
        <View style={s.decoHeaderSmall} />
        {/* Decorative header - top left */}
        <View style={s.decoHeaderTopLeft} />
        <View style={s.decoHeaderLeftVert} />

        {/* HEADER: apenas logo/nome à esquerda */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {agencia.logo_url ? (
              <Image src={agencia.logo_url} style={logoStyle} />
            ) : (
              <Text style={s.agencyName}>{agencia.nome_fantasia || ""}</Text>
            )}
          </View>
        </View>

        {/* TÍTULO */}
        <Text style={s.title}>
          ORÇAMENTO #{orcamento.numero_orcamento || ""}
        </Text>
        <Text style={s.date}>Data: {fmtDate(orcamento.criado_em)}</Text>

        {/* DADOS DO SOLICITANTE */}
        <View style={s.solicitanteSection}>
          <Text style={s.solicitanteTitle}>Dados do Solicitante</Text>
          <Text style={s.solicitanteLine}>
            <Text style={s.solicitanteLabel}>Nome: </Text>
            <Text>{cliente?.nome || "-"}</Text>
          </Text>
          <Text style={s.solicitanteLine}>
            <Text style={s.solicitanteLabel}>Telefone: </Text>
            <Text>{cliente?.telefone || "-"}</Text>
          </Text>
          <Text style={s.solicitanteLine}>
            <Text style={s.solicitanteLabel}>E-mail: </Text>
            <Text>{cliente?.email || "-"}</Text>
          </Text>
        </View>

        {/* TABELA DE SERVIÇOS */}
        <View style={s.tableWrapper}>
          <View style={s.tableHeader}>
            <Text style={s.thService}>SERVIÇO</Text>
            <Text style={s.thDesc}>DESCRIÇÃO</Text>
            <Text style={s.thValue}>VALOR</Text>
          </View>
          {itens.map((item, idx) => (
            <View key={idx} style={idx % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <Text style={s.tdService}>{item.tipo}</Text>
              <View style={s.tdDesc}>
                <Text>{item.descricao || "-"}</Text>
                {(item as any).observacao && (
                  <Text style={{ fontSize: 8, color: "#9CA3AF", marginTop: 3 }}>{(item as any).observacao}</Text>
                )}
              </View>
              <Text style={s.tdValue}>{fmt(Number(item.valor_final) || 0)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalText}>TOTAL: {fmt(Number(orcamento.valor_final) || total)}</Text>
          </View>
        </View>

        {/* RODAPÉ DA TABELA */}
        <View style={s.tableFooter}>
          <View style={s.decoLine} />
          <Text style={s.condLabel}>FORMA DE PAGAMENTO</Text>
          <Text style={s.condValue}>{formatarPagamento(orcamento.forma_pagamento)}</Text>

          {orcamento.validade && (
            <>
              <Text style={s.condLabel}>VALIDADE</Text>
              <Text style={s.condValue}>{fmtDate(orcamento.validade)}</Text>
            </>
          )}

          {orcamento.observacoes && orcamento.observacoes.trim() !== "" && (
            <>
              <Text style={s.condLabel}>OBSERVAÇÕES</Text>
              <Text style={s.condValue}>{orcamento.observacoes}</Text>
            </>
          )}
        </View>

        {/* Linhas decorativas rodapé - cantos */}
        <View style={s.decoFootLeftHorz} />
        <View style={s.decoFootLeftVert} />
        <View style={s.decoFootLeftAccentHorz} />
        <View style={s.decoFootLeftAccentVert} />
        <View style={s.decoFootRightHorz} />
        <View style={s.decoFootRightVert} />
        <View style={s.decoFootRightAccentHorz} />
        <View style={s.decoFootRightAccentVert} />

        {/* Linha decorativa central acima do rodapé */}
        <View style={s.decoFooterLineWrapper}>
          <View style={s.decoFooterLine} />
        </View>

        {/* RODAPÉ FIXO (em todas as páginas) */}
        <View fixed style={s.footer}>
          <Text style={s.footerLine1}>
            Orçamento emitido por {agencia.nome_fantasia || ""}, válido conforme data informada neste documento. Sujeito a alteração de valores sem aviso prévio conforme Termos e Condições, consulte o seu agente de viagens para mais informações.
          </Text>
          <Text style={s.footerLine2}>
            {agencia.nome_fantasia || ""} · {agencia.telefone || ""} · {agencia.email || ""}
          </Text>
          <Text style={s.footerLine3}>
            ViaHub · powered by Maralto
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default OrcamentoPDFDocument;
