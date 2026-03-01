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
