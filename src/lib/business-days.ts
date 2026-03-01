export interface HorarioDia {
  ativo: boolean;
  inicio: string;
  fim: string;
}

export interface HorarioFuncionamento {
  segunda: HorarioDia;
  terca: HorarioDia;
  quarta: HorarioDia;
  quinta: HorarioDia;
  sexta: HorarioDia;
  sabado: HorarioDia;
  domingo: HorarioDia;
  [key: string]: HorarioDia;
}

export const DEFAULT_HORARIO: HorarioFuncionamento = {
  segunda: { ativo: true, inicio: "08:00", fim: "18:00" },
  terca: { ativo: true, inicio: "08:00", fim: "18:00" },
  quarta: { ativo: true, inicio: "08:00", fim: "18:00" },
  quinta: { ativo: true, inicio: "08:00", fim: "18:00" },
  sexta: { ativo: true, inicio: "08:00", fim: "18:00" },
  sabado: { ativo: true, inicio: "08:00", fim: "12:00" },
  domingo: { ativo: false, inicio: "", fim: "" },
};

const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

/**
 * Calculate business days between a start date and now,
 * using the agency's working schedule.
 */
export function calcularDiasUteis(
  dataInicio: Date,
  horario: HorarioFuncionamento = DEFAULT_HORARIO
): number {
  let dias = 0;
  const data = new Date(dataInicio);
  data.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  while (data < hoje) {
    const diaSemana = DIAS_SEMANA[data.getDay()];
    if (horario[diaSemana]?.ativo) dias++;
    data.setDate(data.getDate() + 1);
  }
  return dias;
}
