import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const DARK_BLUE = "#1E3A5F";
const PRIMARY = "#2563EB";
const TEXT_COLOR = "#1a1a1a";
const MUTED = "#6b7280";
const LIGHT_BG = "#F8F9FA";
const BORDER = "#e5e7eb";
const OBS_BG = "#FFFBEB";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: TEXT_COLOR,
    paddingBottom: 60,
  },
  // Header
  headerBg: {
    backgroundColor: DARK_BLUE,
    paddingVertical: 24,
    paddingHorizontal: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agencyName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerNumero: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  headerMeta: {
    fontSize: 8,
    color: "#cbd5e1",
    marginBottom: 1,
  },
  headerMetaValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#e2e8f0",
    marginBottom: 4,
  },
  // Content area
  content: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  // Traveler section
  travelerBox: {
    backgroundColor: LIGHT_BG,
    borderRadius: 4,
    padding: 14,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: DARK_BLUE,
    marginBottom: 10,
  },
  travelerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  travelerItem: {
    width: "50%",
    marginBottom: 4,
  },
  travelerLabel: { fontSize: 8, color: MUTED },
  travelerValue: { fontSize: 10 },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableRowAlt: {
    backgroundColor: LIGHT_BG,
  },
  colService: { flex: 3 },
  colValue: { flex: 1, textAlign: "right" as const },
  itemType: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  itemDesc: { fontSize: 8, color: MUTED, marginTop: 1 },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    marginBottom: 20,
  },
  totalLabel: {
    flex: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: TEXT_COLOR,
    textAlign: "right" as const,
    paddingRight: 12,
  },
  totalValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textAlign: "right" as const,
    color: PRIMARY,
  },
  // Conditions
  conditionsBox: {
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  conditionsGrid: {
    flexDirection: "row",
    gap: 24,
  },
  condLabel: { fontSize: 8, color: MUTED },
  condValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  obsBox: {
    backgroundColor: OBS_BG,
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
  },
  obsTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 3, color: "#92400e" },
  obsText: { fontSize: 9, color: "#78350f" },
  // Footer
  footer: {
    position: "absolute" as const,
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 2,
    borderTopColor: PRIMARY,
    paddingTop: 8,
    alignItems: "center" as const,
  },
  footerAgency: { fontSize: 8, color: MUTED, marginBottom: 2 },
  footerPowered: { fontSize: 7, color: "#9ca3af" },
  pageNumber: {
    position: "absolute" as const,
    bottom: 0,
    right: 0,
    fontSize: 7,
    color: MUTED,
  },
});

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null) =>
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

export interface OrcamentoPDFData {
  orcamento: {
    numero_orcamento?: string | null;
    titulo?: string | null;
    validade?: string | null;
    criado_em?: string | null;
    moeda?: string | null;
    forma_pagamento?: string | null;
    observacoes?: string | null;
    valor_final?: number | null;
  };
  cliente: {
    nome?: string | null;
    email?: string | null;
    telefone?: string | null;
  } | null;
  itens: {
    tipo: string;
    descricao?: string | null;
    valor_final?: number | null;
    quantidade?: number | null;
  }[];
  agencia: {
    nome_fantasia: string;
    email?: string | null;
    telefone?: string | null;
    logo_url?: string | null;
  };
}

export default function OrcamentoPDF({ data }: { data: OrcamentoPDFData }) {
  const { orcamento, cliente, itens, agencia } = data;
  const total = itens.reduce((s, i) => s + (Number(i.valor_final) || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerBg}>
          <View style={styles.headerLeft}>
            {agencia.logo_url ? (
              <Image
                src={agencia.logo_url}
                style={{ maxWidth: 100, maxHeight: 50, objectFit: "contain" as any }}
              />
            ) : null}
            <Text style={styles.agencyName}>{agencia.nome_fantasia}</Text>
          </View>
          <View style={styles.headerRight}>
            {orcamento.numero_orcamento && (
              <Text style={styles.headerNumero}>{orcamento.numero_orcamento}</Text>
            )}
            <Text style={styles.headerMeta}>Data de Emissão</Text>
            <Text style={styles.headerMetaValue}>{fmtDate(orcamento.criado_em ?? null)}</Text>
            <Text style={styles.headerMeta}>Validade</Text>
            <Text style={styles.headerMetaValue}>{fmtDate(orcamento.validade ?? null)}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Traveler */}
          <View style={styles.travelerBox}>
            <Text style={styles.sectionTitle}>Dados do Viajante</Text>
            <View style={styles.travelerGrid}>
              <View style={styles.travelerItem}>
                <Text style={styles.travelerLabel}>Nome</Text>
                <Text style={styles.travelerValue}>{cliente?.nome || "-"}</Text>
              </View>
              <View style={styles.travelerItem}>
                <Text style={styles.travelerLabel}>Email</Text>
                <Text style={styles.travelerValue}>{cliente?.email || "-"}</Text>
              </View>
              <View style={styles.travelerItem}>
                <Text style={styles.travelerLabel}>Telefone</Text>
                <Text style={styles.travelerValue}>{cliente?.telefone || "-"}</Text>
              </View>
            </View>
          </View>

          {/* Services Table */}
          <Text style={styles.sectionTitle}>Serviços</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colService]}>Serviço</Text>
            <Text style={[styles.tableHeaderText, styles.colValue]}>Valor</Text>
          </View>
          {itens.map((item, idx) => (
            <View
              key={idx}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <View style={styles.colService}>
                <Text style={styles.itemType}>
                  {item.tipo}
                  {(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}
                </Text>
                {item.descricao ? (
                  <Text style={styles.itemDesc}>{item.descricao}</Text>
                ) : null}
              </View>
              <Text style={[{ fontSize: 9 }, styles.colValue]}>
                {fmt(Number(item.valor_final) || 0)}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>
              {fmt(Number(orcamento.valor_final) || total)}
            </Text>
          </View>

          {/* Conditions */}
          <View style={styles.conditionsBox}>
            <Text style={{ ...styles.sectionTitle, marginBottom: 6, marginTop: 0 }}>
              Condições
            </Text>
            <View style={styles.conditionsGrid}>
              <View>
                <Text style={styles.condLabel}>Forma de Pagamento</Text>
                <Text style={styles.condValue}>
                  {formatarFormaPagamento(orcamento.forma_pagamento)}
                </Text>
              </View>
              {orcamento.validade && (
                <View>
                  <Text style={styles.condLabel}>Válido até</Text>
                  <Text style={styles.condValue}>{fmtDate(orcamento.validade)}</Text>
                </View>
              )}
            </View>
          </View>

          {orcamento.observacoes && (
            <View style={styles.obsBox}>
              <Text style={styles.obsTitle}>Observações</Text>
              <Text style={styles.obsText}>{orcamento.observacoes}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerAgency}>
            {agencia.nome_fantasia}
            {agencia.email ? ` · ${agencia.email}` : ""}
            {agencia.telefone ? ` · ${agencia.telefone}` : ""}
          </Text>
          <Text style={styles.footerPowered}>
            Orçamento gerado pelo ViaHub · powered by Maralto
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
