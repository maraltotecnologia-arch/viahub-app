/**
 * Utilitários de aniversário.
 * Todas as comparações ignoram o ano — considera apenas dia e mês.
 * Timezone: America/Sao_Paulo (Brasília).
 */

/** Retorna o número de dias até o próximo aniversário.
 *  0 = hoje, 1-N = próximos N dias, null = sem data/data inválida. */
export function diasParaAniversario(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const parts = dateStr.substring(0, 10).split("-");
  if (parts.length !== 3) return null;
  const mes = parseInt(parts[1], 10) - 1; // 0-indexed
  const dia = parseInt(parts[2], 10);
  if (isNaN(mes) || isNaN(dia) || mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;

  // Extrai "hoje" no fuso de Brasília sem depender de bibliotecas externas
  const agoraBrasilia = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  const anoAtual = agoraBrasilia.getFullYear();
  const hoje = new Date(anoAtual, agoraBrasilia.getMonth(), agoraBrasilia.getDate());

  let proximo = new Date(anoAtual, mes, dia);
  if (proximo < hoje) {
    proximo = new Date(anoAtual + 1, mes, dia);
  }

  return Math.round((proximo.getTime() - hoje.getTime()) / 86_400_000);
}

/** "dd/mm" para exibição na UI, sem o ano. */
export function formatarDiaMes(dateStr: string): string {
  const parts = dateStr.substring(0, 10).split("-");
  if (parts.length !== 3) return "";
  return `${parts[2]}/${parts[1]}`;
}

/** Monta mensagem de parabéns pré-preenchida para WhatsApp. */
export function mensagemAniversario(nomeCompleto: string, dias: number): string {
  const nome = nomeCompleto.split(" ")[0];
  if (dias === 0) {
    return `Olá ${nome}! Hoje é um dia muito especial — feliz aniversário! 🎂🎉 Que este novo ciclo seja cheio de viagens incríveis e momentos inesquecíveis!`;
  }
  return `Olá ${nome}! Em breve é seu aniversário e já queremos te desejar um feliz dia! 🎂✈️ Que venham muitas aventuras neste novo ciclo!`;
}

/** Link wa.me com mensagem pré-preenchida, ou null se não houver telefone. */
export function waAniversarioLink(telefone: string | null | undefined, nome: string, dias: number): string | null {
  const tel = telefone?.replace(/\D/g, "");
  if (!tel) return null;
  return `https://wa.me/55${tel}?text=${encodeURIComponent(mensagemAniversario(nome, dias))}`;
}
