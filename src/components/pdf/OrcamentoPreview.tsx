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

const OrcamentoPreview = forwardRef<HTMLDivElement, { data: OrcamentoPDFData }>(
  ({ data }, ref) => {
    const { orcamento, cliente, itens, agencia } = data;
    const total = itens.reduce((s, i) => s + (Number(i.valor_final) || 0), 0);

    return (
      <div
        ref={ref}
        style={{
          width: 794,
          background: "#fff",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#1a1a1a",
          fontSize: 12,
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: "#1E3A5F",
            padding: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {agencia.logo_url && (
              <img
                src={agencia.logo_url}
                alt="Logo"
                style={{ maxHeight: 60, maxWidth: 100, objectFit: "contain" }}
                crossOrigin="anonymous"
              />
            )}
            <span style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>
              {agencia.nome_fantasia}
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            {orcamento.numero_orcamento && (
              <>
                <div style={{ fontSize: 9, color: "#94a3b8" }}>Nº do Orçamento</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  {orcamento.numero_orcamento}
                </div>
              </>
            )}
            <div style={{ fontSize: 9, color: "#94a3b8" }}>Data de Emissão</div>
            <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 4 }}>
              {fmtDate(orcamento.criado_em ?? null)}
            </div>
            <div style={{ fontSize: 9, color: "#94a3b8" }}>Validade</div>
            <div style={{ fontSize: 11, color: "#cbd5e1" }}>
              {fmtDate(orcamento.validade ?? null)}
            </div>
          </div>
        </div>

        {/* GRADIENT LINE */}
        <div
          style={{
            height: 4,
            background: "linear-gradient(to right, #2563EB, #06B6D4)",
          }}
        />

        {/* CONTENT */}
        <div style={{ padding: "20px 40px 40px 40px" }}>
          {/* VIAJANTE */}
          <div
            style={{
              background: "#F8F9FA",
              padding: 16,
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#2563EB",
                marginBottom: 10,
              }}
            >
              Dados do Viajante
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#6B7280" }}>Nome</div>
                <div style={{ fontSize: 12 }}>{cliente?.nome || "-"}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#6B7280" }}>Email</div>
                <div style={{ fontSize: 12 }}>{cliente?.email || "-"}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#6B7280" }}>Telefone</div>
                <div style={{ fontSize: 12 }}>{cliente?.telefone || "-"}</div>
              </div>
            </div>
          </div>

          {/* TABELA */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1E3A5F",
              marginBottom: 8,
            }}
          >
            Serviços
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: 24,
            }}
          >
            <thead>
              <tr style={{ background: "#2563EB" }}>
                <th
                  style={{
                    textAlign: "left",
                    color: "#fff",
                    padding: "10px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Serviço
                </th>
                <th
                  style={{
                    textAlign: "right",
                    color: "#fff",
                    padding: "10px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    width: 140,
                  }}
                >
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    background: idx % 2 === 1 ? "#F8F9FA" : "#fff",
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ fontWeight: 600, fontSize: 11 }}>
                      {item.tipo}
                      {(item.quantidade ?? 1) > 1 ? ` (x${item.quantidade})` : ""}
                    </div>
                    {item.descricao && (
                      <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>
                        {item.descricao}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      textAlign: "right",
                      fontSize: 11,
                    }}
                  >
                    {fmt(Number(item.valor_final) || 0)}
                  </td>
                </tr>
              ))}
              {/* TOTAL */}
              <tr style={{ background: "#1E3A5F" }}>
                <td
                  style={{
                    padding: "10px 12px",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    textAlign: "right",
                  }}
                >
                  TOTAL
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    textAlign: "right",
                  }}
                >
                  {fmt(Number(orcamento.valor_final) || total)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* CONDIÇÕES */}
          <div
            style={{
              borderLeft: "4px solid #2563EB",
              paddingLeft: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#1E3A5F",
                marginBottom: 6,
              }}
            >
              Condições
            </div>
            <div style={{ display: "flex", gap: 32 }}>
              <div>
                <div style={{ fontSize: 9, color: "#6B7280" }}>Forma de Pagamento</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {formatarFormaPagamento(orcamento.forma_pagamento)}
                </div>
              </div>
              {orcamento.validade && (
                <div>
                  <div style={{ fontSize: 9, color: "#6B7280" }}>Válido até</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>
                    {fmtDate(orcamento.validade)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {orcamento.observacoes && (
            <div
              style={{
                background: "#FFFBEB",
                borderRadius: 4,
                padding: 8,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#92400e",
                  marginBottom: 3,
                }}
              >
                Observações
              </div>
              <div style={{ fontSize: 10, color: "#78350f" }}>
                {orcamento.observacoes}
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div
            style={{
              borderTop: "2px solid #E5E7EB",
              paddingTop: 12,
              marginTop: 20,
              textAlign: "center",
            }}
          >
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
      </div>
    );
  }
);

OrcamentoPreview.displayName = "OrcamentoPreview";

export default OrcamentoPreview;
