
-- Agências (tenant principal)
CREATE TABLE public.agencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  email TEXT,
  telefone TEXT,
  plano TEXT DEFAULT 'starter_a',
  ativo BOOLEAN DEFAULT true,
  onboarding_completo BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Usuários vinculados à agência
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  cargo TEXT DEFAULT 'agente',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações de markup por agência
CREATE TABLE public.configuracoes_markup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE CASCADE NOT NULL,
  tipo_servico TEXT NOT NULL,
  markup_percentual DECIMAL(5,2) DEFAULT 0,
  taxa_fixa DECIMAL(10,2) DEFAULT 0,
  forma_pagamento TEXT DEFAULT 'todas',
  acrescimo_cartao DECIMAL(5,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true
);

-- Clientes da agência (CRM)
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  passaporte TEXT,
  data_nascimento DATE,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Orçamentos
CREATE TABLE public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  usuario_id UUID REFERENCES public.usuarios(id),
  titulo TEXT,
  status TEXT DEFAULT 'rascunho',
  valor_custo DECIMAL(12,2) DEFAULT 0,
  valor_final DECIMAL(12,2) DEFAULT 0,
  lucro_bruto DECIMAL(12,2) DEFAULT 0,
  margem_percentual DECIMAL(5,2) DEFAULT 0,
  moeda TEXT DEFAULT 'BRL',
  validade DATE,
  forma_pagamento TEXT DEFAULT 'pix',
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Itens do orçamento
CREATE TABLE public.itens_orcamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  valor_custo DECIMAL(12,2) DEFAULT 0,
  markup_percentual DECIMAL(5,2) DEFAULT 0,
  taxa_fixa DECIMAL(10,2) DEFAULT 0,
  valor_final DECIMAL(12,2) DEFAULT 0,
  quantidade INTEGER DEFAULT 1,
  detalhes JSONB
);

-- Enable RLS on all tables
ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_markup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_orcamento ENABLE ROW LEVEL SECURITY;

-- Helper function: get user's agencia_id
CREATE OR REPLACE FUNCTION public.get_user_agencia_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agencia_id FROM public.usuarios WHERE id = auth.uid()
$$;

-- Agencias policies: users can only see their own agency
CREATE POLICY "Users can view their agency" ON public.agencias
  FOR SELECT TO authenticated
  USING (id = public.get_user_agencia_id());

CREATE POLICY "Users can update their agency" ON public.agencias
  FOR UPDATE TO authenticated
  USING (id = public.get_user_agencia_id());

-- Usuarios policies
CREATE POLICY "Users can view agency members" ON public.usuarios
  FOR SELECT TO authenticated
  USING (agencia_id = public.get_user_agencia_id());

CREATE POLICY "Users can update own profile" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Configuracoes markup policies
CREATE POLICY "Users can view agency markup" ON public.configuracoes_markup
  FOR SELECT TO authenticated
  USING (agencia_id = public.get_user_agencia_id());

CREATE POLICY "Users can manage agency markup" ON public.configuracoes_markup
  FOR ALL TO authenticated
  USING (agencia_id = public.get_user_agencia_id())
  WITH CHECK (agencia_id = public.get_user_agencia_id());

-- Clientes policies
CREATE POLICY "Users can view agency clients" ON public.clientes
  FOR SELECT TO authenticated
  USING (agencia_id = public.get_user_agencia_id());

CREATE POLICY "Users can manage agency clients" ON public.clientes
  FOR ALL TO authenticated
  USING (agencia_id = public.get_user_agencia_id())
  WITH CHECK (agencia_id = public.get_user_agencia_id());

-- Orcamentos policies
CREATE POLICY "Users can view agency quotes" ON public.orcamentos
  FOR SELECT TO authenticated
  USING (agencia_id = public.get_user_agencia_id());

CREATE POLICY "Users can manage agency quotes" ON public.orcamentos
  FOR ALL TO authenticated
  USING (agencia_id = public.get_user_agencia_id())
  WITH CHECK (agencia_id = public.get_user_agencia_id());

-- Itens orcamento policies (through orcamento's agencia)
CREATE POLICY "Users can view quote items" ON public.itens_orcamento
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos o
      WHERE o.id = orcamento_id AND o.agencia_id = public.get_user_agencia_id()
    )
  );

CREATE POLICY "Users can manage quote items" ON public.itens_orcamento
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orcamentos o
      WHERE o.id = orcamento_id AND o.agencia_id = public.get_user_agencia_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orcamentos o
      WHERE o.id = orcamento_id AND o.agencia_id = public.get_user_agencia_id()
    )
  );

-- Trigger to auto-update atualizado_em on orcamentos
CREATE OR REPLACE FUNCTION public.update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_orcamentos_atualizado_em
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_atualizado_em();
