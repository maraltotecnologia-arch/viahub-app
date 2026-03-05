import React, { forwardRef } from "react";
import { buildServiceDateInfo } from "@/lib/service-dates";

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
    observacao?: string | null;
    partida_data?: string | null;
    partida_hora?: string | null;
    chegada_data?: string | null;
    chegada_hora?: string | null;
    checkin_data?: string | null;
    checkin_hora?: string | null;
    checkout_data?: string | null;
    checkout_hora?: string | null;
  }[];
  agencia: {
    nome_fantasia: string;
    email?: string | null;
    telefone?: string | null;
    logo_url?: string | null;
  };
  logoDims?: { width: number; height: number };
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
        {/* Decorative top-left circles */}
        <div style={{ position: "absolute", top: -100, left: -100, width: 300, height: 300, borderRadius: "50%", background: "#F0F4FF" }} />
        <div style={{ position: "absolute", top: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "#E8EEFF" }} />

        {/* Decorative top-right rectangles */}
        <div style={{ position: "absolute", top: -40, right: -30, width: 120, height: 180, background: "#1E3A8A", transform: "rotate(15deg)" }} />
        <div style={{ position: "absolute", top: -20, right: 10, width: 80, height: 140, background: "#2563EB", transform: "rotate(15deg)" }} />

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A8A", letterSpacing: 1, textTransform: "uppercase" as const }}>
            {agencia.nome_fantasia}
          </div>
          <div style={{ textAlign: "right" }}>
            {agencia.telefone && <div style={{ fontSize: 11, color: "#374151" }}>{agencia.telefone}</div>}
            {agencia.email && <div style={{ fontSize: 11, color: "#374151" }}>{agencia.email}</div>}
          </div>
        </div>

        {/* TÍTULO DO ORÇAMENTO */}
        <div style={{ marginTop: 24, position: "relative", zIndex: 1 }}>
          {agencia.logo_url && (
            <img src={agencia.logo_url} alt="Logo" style={{ height: 48, objectFit: "contain", marginBottom: 8 }} crossOrigin="anonymous" />
          )}
          <div style={{ fontSize: 32, fontWeight: 800, color: "#1E3A8A", letterSpacing: -0.5 }}>
            ORÇAMENTO #{orcamento.numero_orcamento || "—"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", marginTop: 4 }}>
            Data: {fmtDate(orcamento.criado_em ?? null)}
          </div>
        </div>

        {/* SEÇÃO A/C */}
        <div style={{ marginTop: 32 }}>
          <div style={{ color: "#2563EB", fontWeight: 700, fontSize: 13 }}>A/C:</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{cliente?.nome || "-"}</div>
          {cliente?.email && <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{cliente.email}</div>}
          {cliente?.telefone && <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{cliente.telefone}</div>}
        </div>

        {/* TABELA DE SERVIÇOS */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 40 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #1E3A8A" }}>
              <th style={{ textAlign: "left", color: "#1E3A8A", fontWeight: 700, padding: "8px 12px", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" as const, width: "25%" }}>
                Serviço
              </th>
              <th style={{ textAlign: "left", color: "#1E3A8A", fontWeight: 700, padding: "8px 12px", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" as const, width: "55%" }}>
                Descrição
              </th>
              <th style={{ textAlign: "right", color: "#1E3A8A", fontWeight: 700, padding: "8px 12px", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" as const, width: "20%" }}>
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item, idx) => {
              const dateInfo = buildServiceDateInfo(item);
              return (
              <tr key={idx}>
                <td style={{ padding: 12, fontSize: 13, color: "#111827", border: "1px solid #E5E7EB" }}>
                  {item.tipo}
                  {(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}
                </td>
                <td style={{ padding: 12, fontSize: 12, color: "#374151", border: "1px solid #E5E7EB" }}>
                  <div>{item.descricao || "-"}</div>
                  {dateInfo && (
                    <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3 }}>{dateInfo}</div>
                  )}
                  {item.observacao && (
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>{item.observacao}</div>
                  )}
                </td>
                <td style={{ padding: 12, textAlign: "right", fontSize: 13, color: "#111827", fontWeight: 500, border: "1px solid #E5E7EB" }}>
                  {fmt(Number(item.valor_final) || 0)}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* TOTAL */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <div style={{ background: "#1E3A8A", color: "#fff", padding: "10px 24px", fontWeight: 700, fontSize: 14, letterSpacing: 0.5 }}>
            TOTAL: {fmt(Number(orcamento.valor_final) || total)}
          </div>
        </div>

        {/* Decorative diagonal lines - center left */}
        <div style={{ position: "absolute", left: 0, top: 650 }}>
          <div style={{ width: 120, height: 2, background: "#2563EB", transform: "rotate(-30deg)", position: "absolute", top: 0, left: -20 }} />
          <div style={{ width: 80, height: 2, background: "#06B6D4", transform: "rotate(-30deg)", position: "absolute", top: 14, left: -10 }} />
          <div style={{ width: 60, height: 2, background: "#2563EB", transform: "rotate(-30deg)", position: "absolute", top: 28, left: 0 }} />
          <div style={{ width: 100, height: 2, background: "#06B6D4", transform: "rotate(-30deg)", position: "absolute", top: 42, left: -15 }} />
        </div>

        {/* FORMA DE PAGAMENTO E CONDIÇÕES */}
        <div style={{ marginTop: 32, textAlign: "center" as const }}>
          <div style={{ width: 48, height: 3, background: "#2563EB", margin: "0 auto 12px" }} />
          <div style={{ color: "#1E3A8A", fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>
            FORMA DE PAGAMENTO
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {formatarFormaPagamento(orcamento.forma_pagamento)}
          </div>

          <div style={{ width: 48, height: 3, background: "#2563EB", margin: "16px auto 12px" }} />
          <div style={{ color: "#1E3A8A", fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>
            TERMOS E CONDIÇÕES
          </div>
          {orcamento.validade && (
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Este orçamento é válido até {fmtDate(orcamento.validade)}
            </div>
          )}
          {orcamento.observacoes && (
            <div style={{ fontSize: 11, color: "#4B5563", marginTop: 4 }}>
              {orcamento.observacoes}
            </div>
          )}
        </div>

        {/* Decorative bottom-right diagonal bars */}
        <div style={{ position: "absolute", bottom: 60, right: -40, width: 200, height: 30, background: "#1E3A8A", transform: "rotate(-30deg)" }} />
        <div style={{ position: "absolute", bottom: 30, right: -20, width: 160, height: 20, background: "#2563EB", transform: "rotate(-30deg)" }} />
        <div style={{ position: "absolute", bottom: 10, right: 0, width: 120, height: 15, background: "#06B6D4", transform: "rotate(-30deg)" }} />

        {/* RODAPÉ */}
        <div style={{ position: "absolute", bottom: 24, left: 48, right: 48, textAlign: "center" as const }}>
          <div style={{ fontSize: 8, color: "#94A3B8", marginBottom: 6 }}>
            Os valores apresentados já incluem todas as taxas de embarque, turismo, serviço e encargos operacionais aplicáveis.
          </div>
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
