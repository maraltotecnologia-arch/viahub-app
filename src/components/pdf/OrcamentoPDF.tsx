import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

const PRIMARY = "#2563EB";
const TEXT_COLOR = "#1a1a1a";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: TEXT_COLOR,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  agencyName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerLabel: { fontSize: 8, color: MUTED },
  headerValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  divider: {
    height: 3,
    backgroundColor: PRIMARY,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 2,
  },
  // Section
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: PRIMARY,
    marginBottom: 8,
    marginTop: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: { fontSize: 9, color: MUTED, width: 80 },
  value: { fontSize: 10 },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: PRIMARY,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 2,
    marginTop: 4,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  colService: { flex: 3 },
  colValue: { flex: 1, textAlign: "right" as const },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: "#f0f4ff",
    borderRadius: 2,
    marginTop: 2,
  },
  totalLabel: {
    flex: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "right" as const,
    paddingRight: 12,
  },
  totalValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    textAlign: "right" as const,
    color: PRIMARY,
  },
  // Conditions
  conditionText: { fontSize: 9, color: MUTED, marginBottom: 3 },
  obsBlock: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 2,
  },
  // Footer
  footer: {
    position: "absolute" as const,
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: MUTED },
  pageNumber: { fontSize: 7, color: MUTED },
});

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "-";

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
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {agencia.logo_url ? (
              <Image src={agencia.logo_url} style={{ maxWidth: 120, maxHeight: 60, objectFit: "contain" as any }} />
            ) : null}
            <Text style={styles.agencyName}>{agencia.nome_fantasia}</Text>
          </View>
          <View style={styles.headerRight}>
            {orcamento.numero_orcamento && (
              <View style={{ marginBottom: 2 }}>
                <Text style={styles.headerLabel}>Nº do Orçamento</Text>
                <Text style={styles.headerValue}>{orcamento.numero_orcamento}</Text>
              </View>
            )}
            <View style={{ marginBottom: 2 }}>
              <Text style={styles.headerLabel}>Data de Emissão</Text>
              <Text style={styles.headerValue}>{fmtDate(orcamento.criado_em ?? null)}</Text>
            </View>
            <View>
              <Text style={styles.headerLabel}>Validade</Text>
              <Text style={styles.headerValue}>{fmtDate(orcamento.validade ?? null)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.divider} />

        {/* Client */}
        <Text style={styles.sectionTitle}>Dados do Viajante</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.value}>{cliente?.nome || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{cliente?.email || "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Telefone:</Text>
          <Text style={styles.value}>{cliente?.telefone || "-"}</Text>
        </View>

        {/* Items table */}
        <Text style={styles.sectionTitle}>Serviços</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colService]}>Serviço</Text>
          <Text style={[styles.tableHeaderText, styles.colValue]}>Valor</Text>
        </View>
        {itens.map((item, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[{ fontSize: 9 }, styles.colService]}>
              {item.tipo}
              {item.descricao ? ` — ${item.descricao}` : ""}
              {(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}
            </Text>
            <Text style={[{ fontSize: 9 }, styles.colValue]}>
              {fmt(Number(item.valor_final) || 0)}
            </Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{fmt(Number(orcamento.valor_final) || total)}</Text>
        </View>

        {/* Conditions */}
        <Text style={styles.sectionTitle}>Condições</Text>
        <Text style={styles.conditionText}>
          Forma de pagamento: {orcamento.forma_pagamento || "Não informada"}
        </Text>
        {orcamento.validade && (
          <Text style={styles.conditionText}>
            Este orçamento é válido até {fmtDate(orcamento.validade)}.
          </Text>
        )}
        {orcamento.observacoes && (
          <View style={styles.obsBlock}>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 3 }}>
              Observações
            </Text>
            <Text style={{ fontSize: 9, color: MUTED }}>{orcamento.observacoes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {agencia.nome_fantasia}
            {agencia.email ? ` | ${agencia.email}` : ""}
            {agencia.telefone ? ` | ${agencia.telefone}` : ""}
          </Text>
          <Text style={styles.footerText}>
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
