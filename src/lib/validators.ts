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
  emitido: [],
  perdido: ["rascunho"],
};

export const getTransicoesPermitidas = (statusAtual: string): string[] => {
  return transicoes[statusAtual] || [];
};

export const isTransicaoPermitida = (de: string, para: string): boolean => {
  return getTransicoesPermitidas(de).includes(para);
};
