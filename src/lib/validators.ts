import { z } from "zod";

export const validarCNPJ = (cnpj: string): boolean => {
  const c = cnpj.replace(/\D/g, "");
  if (c.length !== 14) return false;
  if (/^(\d)\1+$/.test(c)) return false;

  let sum = 0;
  let pos = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(c[i]) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(c[12])) return false;

  sum = 0;
  pos = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(c[i]) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(c[13]);
};

export const validarTelefone = (tel: string): boolean => {
  const numeros = tel.replace(/\D/g, "");
  return numeros.length >= 10 && numeros.length <= 13;
};

// Status transition rules
const transicoes: Record<string, string[]> = {
  rascunho: ["enviado", "perdido"],
  enviado: ["aprovado", "perdido", "rascunho"],
  aprovado: ["emitido", "perdido"],
  emitido: ["pago"],
  pago: [],
  perdido: ["rascunho"],
};

export const getTransicoesPermitidas = (statusAtual: string): string[] => {
  return transicoes[statusAtual] || [];
};

export const isTransicaoPermitida = (de: string, para: string): boolean => {
  return getTransicoesPermitidas(de).includes(para);
};

// ─── Zod Schemas for Form Validation ───

/** Schema for creating/editing a client */
export const clienteSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(150, "Nome deve ter no máximo 150 caracteres"),
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255, "Email muito longo")
    .or(z.literal(""))
    .optional(),
  telefone: z.string().optional().or(z.literal("")),
  cpf: z.string().optional().or(z.literal("")),
});

/** Schema for a quote item */
export const itemOrcamentoSchema = z.object({
  tipo: z.string().min(1, "Selecione o tipo de serviço"),
  descricao: z.string().trim().min(1, "Preencha a descrição do item"),
  valor_custo: z.number().min(0, "Valor de custo inválido"),
  markup_percentual: z.number().min(0).max(1000),
  taxa_fixa: z.number().min(0),
  quantidade: z.number().int().min(1, "Quantidade mínima é 1"),
});

/** Schema for creating/editing a quote */
export const orcamentoSchema = z.object({
  cliente_id: z.string().uuid("Selecione um cliente válido"),
  titulo: z.string().max(200, "Título muito longo").optional(),
  validade: z.string().min(1, "Defina a data de validade"),
  moeda: z.enum(["BRL", "USD", "EUR"]).default("BRL"),
  observacoes: z.string().max(5000, "Observações muito longas").optional(),
  forma_pagamento: z.enum(["pix", "credito", "boleto", "transferencia"]).default("pix"),
  itens: z.array(itemOrcamentoSchema).min(1, "Adicione pelo menos um item"),
});
