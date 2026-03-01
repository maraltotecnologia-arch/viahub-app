import { format } from "date-fns";

export const validarData = (valor: string, minYear = 2020, maxYear = 2099): boolean => {
  if (!valor) return false;
  const data = new Date(valor + "T00:00:00");
  const ano = data.getFullYear();
  return ano >= minYear && ano <= maxYear && !isNaN(data.getTime());
};

export const validarValidade = (valor: string): boolean => {
  if (!validarData(valor)) return false;
  const data = new Date(valor + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return data >= hoje;
};

export const todayStr = () => format(new Date(), "yyyy-MM-dd");

/** Clamp Calendar date selection to 2020–2099 range */
export const isDateOutOfRange = (date: Date) => {
  const year = date.getFullYear();
  return year < 2020 || year > 2099;
};

/** Extrair yyyy-MM-dd sem conversão de timezone (para inputs type="date") */
export const formatarDataSemTimezone = (data: string): string => {
  if (!data) return '';
  return data.substring(0, 10);
};

/** Formatar data/hora no fuso de Brasília */
export const formatarDataBrasilia = (
  data: string | Date,
  opcoes?: Intl.DateTimeFormatOptions
): string => {
  if (!data) return '';
  const date = typeof data === 'string' ? new Date(data) : data;
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    ...opcoes,
  });
};

/** Apenas data (sem hora) no fuso de Brasília */
export const formatarApenasDatabrasilia = (
  data: string | Date
): string => {
  if (!data) return '';
  return formatarDataBrasilia(data, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Data e hora no fuso de Brasília */
export const formatarDataHoraBrasilia = (
  data: string | Date
): string => {
  if (!data) return '';
  return formatarDataBrasilia(data, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
