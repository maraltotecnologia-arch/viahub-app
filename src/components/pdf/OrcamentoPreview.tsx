import React, { forwardRef } from "react";

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

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "-";

const formatarFormaPagamento = (forma: string | null | undefined): string => {
  if (!forma) return "Não informada";
  const mapa: Record<string, string> = {
    avista: "À Vista", a_vista: "À Vista", credito: "Crédito", credit: "Crédito",
    debito: "Débito", debit: "Débito", pix: "PIX",
  };
  return mapa[forma.toLowerCase()] ?? forma;
};

const OrcamentoPreview = forwardRef<HTMLDivElement, { data: OrcamentoPDFData }>(
  ({ data }, ref) => {
    const { orcamento, cliente, itens, agencia } = data;
    const total = itens.reduce((s, i) => s + (Number(i.valor_final) || 0), 0);

    return (
      <div
        ref={ref}
        style={{
          width: 794,
          minHeight: 1123,
          background: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#1a1a1a",
          fontSize: 12,
          position: "relative",
          overflow: "hidden",
          padding: 48,
        }}
      >
        {/* Top-right geometric triangle */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 80,
            height: 80,
            background: "linear-gradient(135deg, transparent 50%, #2563EB 50%)",
          }}
        />

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1E3A5F", letterSpacing: 1, textTransform: "uppercase" as const }}>
              {agencia.nome_fantasia}
            </div>
          </div>
          <div style={{ textAlign: "right", paddingTop: 16 }}>
            {agencia.telefone && <div style={{ fontSize: 11, color: "#4B5563" }}>{agencia.telefone}</div>}
            {agencia.email && <div style={{ fontSize: 11, color: "#4B5563" }}>{agencia.email}</div>}
          </div>
        </div>

        {/* TÍTULO DO ORÇAMENTO */}
        <div style={{ marginBottom: 32 }}>
          {agencia.logo_url && (
            <img
              src={agencia.logo_url}
              alt="Logo"
              style={{ maxHeight: 50, objectFit: "contain", marginBottom: 8 }}
              crossOrigin="anonymous"
            />
          )}
          <div style={{ fontSize: 28, fontWeight: 800, color: "#2563EB" }}>
            ORÇAMENTO #{orcamento.numero_orcamento || "—"}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
            Data: {fmtDate(orcamento.criado_em ?? null)}
          </div>
        </div>

        {/* DADOS DO CLIENTE */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "#2563EB", fontWeight: 700 }}>A/C:</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{cliente?.nome || "-"}</div>
          {cliente?.email && <div style={{ fontSize: 12, color: "#6B7280" }}>{cliente.email}</div>}
          {cliente?.telefone && <div style={{ fontSize: 12, color: "#6B7280" }}>{cliente.telefone}</div>}
        </div>

        {/* TABELA DE SERVIÇOS */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #2563EB" }}>
              <th style={{ textAlign: "left", color: "#2563EB", fontWeight: 700, padding: "8px 12px", fontSize: 11, textTransform: "uppercase" as const }}>
                Serviço
              </th>
              <th style={{ textAlign: "left", color: "#2563EB", fontWeight: 700, padding: "8px 12px", fontSize: 11, textTransform: "uppercase" as const }}>
                Descrição
              </th>
              <th style={{ textAlign: "right", color: "#2563EB", fontWeight: 700, padding: "8px 12px", fontSize: 11, textTransform: "uppercase" as const, width: 140 }}>
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #E5E7EB" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600, fontSize: 12 }}>
                  {item.tipo}
                  {(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 11, color: "#6B7280" }}>
                  {item.descricao || "-"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontSize: 12 }}>
                  {fmt(Number(item.valor_final) || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAL */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
          <div style={{
            background: "#2563EB",
            color: "#fff",
            padding: "8px 16px",
            fontWeight: 700,
            fontSize: 14,
            display: "inline-block",
          }}>
            TOTAL: {fmt(Number(orcamento.valor_final) || total)}
          </div>
        </div>

        {/* FORMA DE PAGAMENTO E CONDIÇÕES */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ width: 40, height: 3, background: "#2563EB", marginBottom: 8 }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase" as const, marginBottom: 4 }}>
            Forma de Pagamento
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            {formatarFormaPagamento(orcamento.forma_pagamento)}
          </div>

          <div style={{ width: 40, height: 3, background: "#2563EB", marginBottom: 8 }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", textTransform: "uppercase" as const, marginBottom: 4 }}>
            Termos e Condições
          </div>
          {orcamento.validade && (
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              Este orçamento é válido até {fmtDate(orcamento.validade)}
            </div>
          )}
          {orcamento.observacoes && (
            <div style={{ fontSize: 11, color: "#4B5563", marginTop: 4 }}>
              {orcamento.observacoes}
            </div>
          )}
        </div>

        {/* Bottom-left decorative geometric shapes */}
        <div style={{ position: "absolute", bottom: 0, left: 0 }}>
          <div style={{
            width: 60, height: 60, background: "#2563EB", opacity: 0.15,
            transform: "rotate(45deg)", position: "absolute", bottom: -20, left: -20,
          }} />
          <div style={{
            width: 40, height: 40, background: "#2563EB", opacity: 0.25,
            transform: "rotate(30deg)", position: "absolute", bottom: 10, left: 20,
          }} />
          <div style={{
            width: 30, height: 30, background: "#2563EB", opacity: 0.35,
            transform: "rotate(60deg)", position: "absolute", bottom: 30, left: 5,
          }} />
        </div>

        {/* RODAPÉ */}
        <div style={{
          position: "absolute",
          bottom: 24,
          left: 48,
          right: 48,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 9, color: "#9CA3AF" }}>
            {agencia.nome_fantasia}
            {agencia.email ? ` · ${agencia.email}` : ""}
            {agencia.telefone ? ` · ${agencia.telefone}` : ""}
          </div>
          <div style={{ fontSize: 8, color: "#6B7280", marginTop: 4 }}>
            Orçamento gerado pelo ViaHub · powered by Maralto
          </div>
        </div>
      </div>
    );
  }
);

OrcamentoPreview.displayName = "OrcamentoPreview";

export default OrcamentoPreview;
