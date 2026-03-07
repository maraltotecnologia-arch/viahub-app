// Centralized error codes for ViaHub
// Format: "[Description] (CODE)"

export const ERROR_MESSAGES: Record<string, string> = {
  // AUTH — Authentication & Registration
  AUTH001: "E-mail já cadastrado",
  AUTH002: "CNPJ já cadastrado",
  AUTH003: "Senha incorreta",
  AUTH004: "E-mail não encontrado",
  AUTH005: "Senha deve ter mínimo 8 caracteres e 1 número",
  AUTH006: "Senhas não conferem",
  AUTH007: "CNPJ inválido",
  AUTH008: "Sessão expirada, faça login novamente",
  AUTH009: "Usuário não autenticado",
  AUTH010: "Acesso negado para este cargo",

  // AGE — Agency
  AGE001: "Erro ao criar agência",
  AGE002: "Erro ao atualizar dados da agência",
  AGE003: "Agência não encontrada",
  AGE004: "Erro ao salvar configurações",
  AGE005: "Erro ao carregar dados da agência",

  // PAG — Payments & Subscription
  PAG001: "Cartão recusado",
  PAG002: "CEP inválido para cobrança",
  PAG003: "Erro ao criar assinatura",
  PAG004: "Erro ao gerar QR Code PIX",
  PAG005: "Erro ao gerar boleto",
  PAG006: "Erro ao trocar método de pagamento",
  PAG007: "Erro ao trocar plano",
  PAG008: "Assinatura não encontrada no provedor",
  PAG009: "Pagamento ainda não identificado",
  PAG010: "Plano inativo — contate o suporte",
  PAG011: "Erro ao cancelar cobrança pendente",
  PAG012: "Erro ao criar nova cobrança",

  // ORC — Quotes
  ORC001: "Erro ao criar orçamento",
  ORC002: "Erro ao atualizar orçamento",
  ORC003: "Erro ao excluir orçamento",
  ORC004: "Orçamento não encontrado",
  ORC005: "Erro ao aprovar orçamento",
  ORC006: "Erro ao gerar PDF do orçamento",
  ORC007: "Erro ao duplicar orçamento",

  // CLI — Clients
  CLI001: "Erro ao criar cliente",
  CLI002: "Erro ao atualizar cliente",
  CLI003: "Erro ao excluir cliente",
  CLI004: "Cliente não encontrado",
  CLI005: "E-mail de cliente já cadastrado",

  // USR — Users
  USR001: "Erro ao criar usuário",
  USR002: "Erro ao atualizar usuário",
  USR003: "Erro ao desativar usuário",
  USR004: "Usuário não encontrado",
  USR005: "E-mail de usuário já cadastrado",
  USR006: "Limite de usuários do plano atingido",

  // CFG — Settings
  CFG001: "Erro ao salvar markup",
  CFG002: "Erro ao salvar template",
  CFG003: "Erro ao salvar configurações gerais",
  CFG004: "Erro ao fazer upload de logo",

  // SYS — System
  SYS001: "Erro inesperado. Tente novamente",
  SYS002: "Sem conexão com o servidor",
  SYS003: "Tempo limite excedido",
  SYS004: "Funcionalidade indisponível no momento",
};

/**
 * Format an error message with its code.
 * @param code Error code (e.g. "AUTH001")
 * @param extra Optional extra detail to append
 * @returns Formatted string like "E-mail já cadastrado (AUTH001)"
 */
export const formatError = (code: string, extra?: string): string => {
  const msg = ERROR_MESSAGES[code] || ERROR_MESSAGES["SYS001"];
  return extra ? `${msg}: ${extra} (${code})` : `${msg} (${code})`;
};

/**
 * Parse error from edge function response and format it.
 * Usage: formatEdgeFunctionError(res.data)
 */
export const formatEdgeFunctionError = (data: { code?: string; error?: string } | null | undefined): string => {
  if (!data) return formatError("SYS001");
  if (data.code) return formatError(data.code, undefined);
  if (data.error) return data.error;
  return formatError("SYS001");
};
