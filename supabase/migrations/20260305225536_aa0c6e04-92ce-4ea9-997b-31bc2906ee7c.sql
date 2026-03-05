
ALTER TABLE public.itens_orcamento
  ADD COLUMN partida_data date,
  ADD COLUMN partida_hora time,
  ADD COLUMN chegada_data date,
  ADD COLUMN chegada_hora time,
  ADD COLUMN checkin_data date,
  ADD COLUMN checkin_hora time,
  ADD COLUMN checkout_data date,
  ADD COLUMN checkout_hora time;
