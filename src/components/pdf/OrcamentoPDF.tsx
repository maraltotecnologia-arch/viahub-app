import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

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

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    paddingTop: 32,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  /* ---- HEADER ---- */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: "#2563EB",
    borderBottomStyle: "solid",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 60,
    height: 40,
    marginRight: 10,
    objectFit: "contain" as any,
  },
  agencyName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1E3A5F",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 1,
  },
  orcNumero: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1E3A5F",
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  /* ---- VIAJANTE ---- */
  travelerSection: {
    borderLeftWidth: 3,
    borderLeftColor: "#2563EB",
    borderLeftStyle: "solid",
    paddingLeft: 8,
    marginBottom: 16,
  },
  travelerTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#2563EB",
    marginBottom: 6,
  },
  travelerRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  travelerItem: {
    width: "50%",
  },
  travelerLabel: {
    fontSize: 8,
    color: "#6B7280",
  },
  travelerValue: {
    fontSize: 10,
  },
  /* ---- TABELA ---- */
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1E3A5F",
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  thText: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  rowWhite: {
    backgroundColor: "#FFFFFF",
  },
  rowGray: {
    backgroundColor: "#F8F9FA",
  },
  colService: { flex: 3 },
  colValue: { flex: 1, textAlign: "right" as const },
  itemType: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  itemDesc: { fontSize: 8, color: "#6B7280", marginTop: 1 },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: "#2563EB",
    marginBottom: 20,
  },
  totalLabel: {
    flex: 3,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textAlign: "right" as const,
    paddingRight: 12,
  },
  totalValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    textAlign: "right" as const,
    color: "#2563EB",
  },
  /* ---- CONDIÇÕES ---- */
  condSection: {
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    borderLeftStyle: "solid",
    paddingLeft: 8,
    marginBottom: 14,
  },
  condTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1E3A5F",
    marginBottom: 4,
  },
  condRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  condLabel: { fontSize: 8, color: "#6B7280" },
  condValue: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  obsBox: {
    backgroundColor: "#FFFBEB",
    padding: 8,
    marginTop: 6,
  },
  obsTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#92400e", marginBottom: 2 },
  obsText: { fontSize: 9, color: "#78350f" },
  /* ---- FOOTER ---- */
  footer: {
    position: "absolute" as const,
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 6,
    alignItems: "center" as const,
  },
  footerText: { fontSize: 8, color: "#9CA3AF", marginBottom: 2 },
  footerPowered: { fontSize: 7, color: "#6B7280" },
  pageNum: {
    position: "absolute" as const,
    bottom: 0,
    right: 0,
    fontSize: 7,
    color: "#9CA3AF",
  },
});

export default function OrcamentoPDF({ data }: { data: OrcamentoPDFData }) {
  const { orcamento, cliente, itens, agencia } = data;
  const total = itens.reduce((acc, i) => acc + (Number(i.valor_final) || 0), 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* HEADER */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {agencia.logo_url ? (
              <Image src={agencia.logo_url} style={s.logo} />
            ) : null}
            <Text style={s.agencyName}>{agencia.nome_fantasia}</Text>
          </View>
          <View style={s.headerRight}>
            {orcamento.numero_orcamento && (
              <>
                <Text style={s.metaLabel}>Nº do Orçamento</Text>
                <Text style={s.orcNumero}>{orcamento.numero_orcamento}</Text>
              </>
            )}
            <Text style={s.metaLabel}>Data de Emissão</Text>
            <Text style={s.metaValue}>{fmtDate(orcamento.criado_em ?? null)}</Text>
            <Text style={s.metaLabel}>Validade</Text>
            <Text style={s.metaValue}>{fmtDate(orcamento.validade ?? null)}</Text>
          </View>
        </View>

        {/* VIAJANTE */}
        <View style={s.travelerSection}>
          <Text style={s.travelerTitle}>Dados do Viajante</Text>
          <View style={s.travelerRow}>
            <View style={s.travelerItem}>
              <Text style={s.travelerLabel}>Nome</Text>
              <Text style={s.travelerValue}>{cliente?.nome || "-"}</Text>
            </View>
            <View style={s.travelerItem}>
              <Text style={s.travelerLabel}>Email</Text>
              <Text style={s.travelerValue}>{cliente?.email || "-"}</Text>
            </View>
          </View>
          <View style={s.travelerRow}>
            <View style={s.travelerItem}>
              <Text style={s.travelerLabel}>Telefone</Text>
              <Text style={s.travelerValue}>{cliente?.telefone || "-"}</Text>
            </View>
          </View>
        </View>

        {/* TABELA */}
        <Text style={s.sectionTitle}>Serviços</Text>
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colService]}>Serviço</Text>
          <Text style={[s.thText, s.colValue]}>Valor</Text>
        </View>
        {itens.map((item, idx) => (
          <View
            key={idx}
            style={[s.tableRow, idx % 2 === 0 ? s.rowWhite : s.rowGray]}
          >
            <View style={s.colService}>
              <Text style={s.itemType}>
                {item.tipo}
                {(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}
              </Text>
              {item.descricao ? (
                <Text style={s.itemDesc}>{item.descricao}</Text>
              ) : null}
            </View>
            <Text style={[{ fontSize: 9 }, s.colValue]}>
              {fmt(Number(item.valor_final) || 0)}
            </Text>
          </View>
        ))}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>TOTAL</Text>
          <Text style={s.totalValue}>
            {fmt(Number(orcamento.valor_final) || total)}
          </Text>
        </View>

        {/* CONDIÇÕES */}
        <View style={s.condSection}>
          <Text style={s.condTitle}>Condições</Text>
          <View style={s.condRow}>
            <View>
              <Text style={s.condLabel}>Forma de Pagamento</Text>
              <Text style={s.condValue}>
                {formatarFormaPagamento(orcamento.forma_pagamento)}
              </Text>
            </View>
          </View>
          {orcamento.validade && (
            <View style={s.condRow}>
              <View>
                <Text style={s.condLabel}>Válido até</Text>
                <Text style={s.condValue}>{fmtDate(orcamento.validade)}</Text>
              </View>
            </View>
          )}
        </View>

        {orcamento.observacoes && (
          <View style={s.obsBox}>
            <Text style={s.obsTitle}>Observações</Text>
            <Text style={s.obsText}>{orcamento.observacoes}</Text>
          </View>
        )}

        {/* FOOTER */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {agencia.nome_fantasia}
            {agencia.email ? ` · ${agencia.email}` : ""}
            {agencia.telefone ? ` · ${agencia.telefone}` : ""}
          </Text>
          <Text style={s.footerPowered}>
            Orçamento gerado pelo ViaHub · powered by Maralto
          </Text>
          <Text
            style={s.pageNum}
            render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
