export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agencias: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          ativo: boolean | null
          atualizado_em: string | null
          cep: string | null
          cnpj: string | null
          criado_em: string | null
          data_bloqueio: string | null
          data_proximo_vencimento: string | null
          email: string | null
          forma_pagamento: string | null
          horario_funcionamento: Json | null
          id: string
          logo_url: string | null
          nome_fantasia: string
          onboarding_completo: boolean | null
          plano: string | null
          status_pagamento: string | null
          telefone: string | null
          whatsapp_mensagem_orcamento: string | null
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          cep?: string | null
          cnpj?: string | null
          criado_em?: string | null
          data_bloqueio?: string | null
          data_proximo_vencimento?: string | null
          email?: string | null
          forma_pagamento?: string | null
          horario_funcionamento?: Json | null
          id?: string
          logo_url?: string | null
          nome_fantasia: string
          onboarding_completo?: boolean | null
          plano?: string | null
          status_pagamento?: string | null
          telefone?: string | null
          whatsapp_mensagem_orcamento?: string | null
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          ativo?: boolean | null
          atualizado_em?: string | null
          cep?: string | null
          cnpj?: string | null
          criado_em?: string | null
          data_bloqueio?: string | null
          data_proximo_vencimento?: string | null
          email?: string | null
          forma_pagamento?: string | null
          horario_funcionamento?: Json | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string
          onboarding_completo?: boolean | null
          plano?: string | null
          status_pagamento?: string | null
          telefone?: string | null
          whatsapp_mensagem_orcamento?: string | null
        }
        Relationships: []
      }
      asaas_pagamentos: {
        Row: {
          agencia_id: string
          asaas_payment_id: string | null
          boleto_linha_digitavel: string | null
          boleto_url: string | null
          created_at: string | null
          forma_pagamento: string | null
          id: string
          pago_em: string | null
          pix_copia_cola: string | null
          pix_qr_code: string | null
          status: string | null
          valor: number | null
          vencimento: string | null
        }
        Insert: {
          agencia_id: string
          asaas_payment_id?: string | null
          boleto_linha_digitavel?: string | null
          boleto_url?: string | null
          created_at?: string | null
          forma_pagamento?: string | null
          id?: string
          pago_em?: string | null
          pix_copia_cola?: string | null
          pix_qr_code?: string | null
          status?: string | null
          valor?: number | null
          vencimento?: string | null
        }
        Update: {
          agencia_id?: string
          asaas_payment_id?: string | null
          boleto_linha_digitavel?: string | null
          boleto_url?: string | null
          created_at?: string | null
          forma_pagamento?: string | null
          id?: string
          pago_em?: string | null
          pix_copia_cola?: string | null
          pix_qr_code?: string | null
          status?: string | null
          valor?: number | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asaas_pagamentos_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          agencia_id: string
          cpf: string | null
          criado_em: string | null
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          passaporte: string | null
          tags: string[] | null
          telefone: string | null
        }
        Insert: {
          agencia_id: string
          cpf?: string | null
          criado_em?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          passaporte?: string | null
          tags?: string[] | null
          telefone?: string | null
        }
        Update: {
          agencia_id?: string
          cpf?: string | null
          criado_em?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          passaporte?: string | null
          tags?: string[] | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      comentarios_orcamento: {
        Row: {
          agencia_id: string
          criado_em: string | null
          id: string
          orcamento_id: string
          texto: string
          usuario_id: string
        }
        Insert: {
          agencia_id: string
          criado_em?: string | null
          id?: string
          orcamento_id: string
          texto: string
          usuario_id: string
        }
        Update: {
          agencia_id?: string
          criado_em?: string | null
          id?: string
          orcamento_id?: string
          texto?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_orcamento_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_orcamento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_markup: {
        Row: {
          acrescimo_cartao: number | null
          agencia_id: string
          ativo: boolean | null
          forma_pagamento: string | null
          id: string
          markup_percentual: number | null
          taxa_fixa: number | null
          tipo_servico: string
        }
        Insert: {
          acrescimo_cartao?: number | null
          agencia_id: string
          ativo?: boolean | null
          forma_pagamento?: string | null
          id?: string
          markup_percentual?: number | null
          taxa_fixa?: number | null
          tipo_servico: string
        }
        Update: {
          acrescimo_cartao?: number | null
          agencia_id?: string
          ativo?: boolean | null
          forma_pagamento?: string | null
          id?: string
          markup_percentual?: number | null
          taxa_fixa?: number | null
          tipo_servico?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_markup_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos_cliente: {
        Row: {
          agencia_id: string
          cargo: string | null
          cliente_id: string
          criado_em: string | null
          email: string | null
          id: string
          nome: string
          principal: boolean | null
          telefone: string | null
        }
        Insert: {
          agencia_id: string
          cargo?: string | null
          cliente_id: string
          criado_em?: string | null
          email?: string | null
          id?: string
          nome: string
          principal?: boolean | null
          telefone?: string | null
        }
        Update: {
          agencia_id?: string
          cargo?: string | null
          cliente_id?: string
          criado_em?: string | null
          email?: string | null
          id?: string
          nome?: string
          principal?: boolean | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contatos_cliente_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contatos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_orcamento: {
        Row: {
          agencia_id: string
          criado_em: string | null
          descricao: string | null
          id: string
          orcamento_id: string
          status_anterior: string | null
          status_novo: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          agencia_id: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          orcamento_id: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          agencia_id?: string
          criado_em?: string | null
          descricao?: string | null
          id?: string
          orcamento_id?: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_orcamento_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_orcamento_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_orcamento: {
        Row: {
          checkin_data: string | null
          checkin_hora: string | null
          checkout_data: string | null
          checkout_hora: string | null
          chegada_data: string | null
          chegada_hora: string | null
          descricao: string | null
          detalhes: Json | null
          id: string
          markup_percentual: number | null
          observacao: string | null
          orcamento_id: string
          partida_data: string | null
          partida_hora: string | null
          quantidade: number | null
          taxa_fixa: number | null
          tipo: string
          valor_custo: number | null
          valor_final: number | null
        }
        Insert: {
          checkin_data?: string | null
          checkin_hora?: string | null
          checkout_data?: string | null
          checkout_hora?: string | null
          chegada_data?: string | null
          chegada_hora?: string | null
          descricao?: string | null
          detalhes?: Json | null
          id?: string
          markup_percentual?: number | null
          observacao?: string | null
          orcamento_id: string
          partida_data?: string | null
          partida_hora?: string | null
          quantidade?: number | null
          taxa_fixa?: number | null
          tipo: string
          valor_custo?: number | null
          valor_final?: number | null
        }
        Update: {
          checkin_data?: string | null
          checkin_hora?: string | null
          checkout_data?: string | null
          checkout_hora?: string | null
          chegada_data?: string | null
          chegada_hora?: string | null
          descricao?: string | null
          detalhes?: Json | null
          id?: string
          markup_percentual?: number | null
          observacao?: string | null
          orcamento_id?: string
          partida_data?: string | null
          partida_hora?: string | null
          quantidade?: number | null
          taxa_fixa?: number | null
          tipo?: string
          valor_custo?: number | null
          valor_final?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_orcamento_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_template: {
        Row: {
          descricao: string | null
          id: string
          markup_percentual: number | null
          quantidade: number | null
          taxa_fixa: number | null
          template_id: string
          tipo: string
          valor_custo: number | null
          valor_final: number | null
        }
        Insert: {
          descricao?: string | null
          id?: string
          markup_percentual?: number | null
          quantidade?: number | null
          taxa_fixa?: number | null
          template_id: string
          tipo: string
          valor_custo?: number | null
          valor_final?: number | null
        }
        Update: {
          descricao?: string | null
          id?: string
          markup_percentual?: number | null
          quantidade?: number | null
          taxa_fixa?: number | null
          template_id?: string
          tipo?: string
          valor_custo?: number | null
          valor_final?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_template_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates_orcamento"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_acesso: {
        Row: {
          agencia_id: string
          cargo: string | null
          criado_em: string
          id: string
          ip: string | null
          usuario_id: string
          usuario_nome: string | null
        }
        Insert: {
          agencia_id: string
          cargo?: string | null
          criado_em?: string
          id?: string
          ip?: string | null
          usuario_id: string
          usuario_nome?: string | null
        }
        Update: {
          agencia_id?: string
          cargo?: string | null
          criado_em?: string
          id?: string
          ip?: string | null
          usuario_id?: string
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_acesso_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_acesso_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_agentes: {
        Row: {
          agencia_id: string
          ano: number
          atualizado_em: string | null
          criado_em: string | null
          id: string
          mes: number
          meta_orcamentos: number | null
          meta_valor: number | null
          usuario_id: string
        }
        Insert: {
          agencia_id: string
          ano: number
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          mes: number
          meta_orcamentos?: number | null
          meta_valor?: number | null
          usuario_id: string
        }
        Update: {
          agencia_id?: string
          ano?: number
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          mes?: number
          meta_orcamentos?: number | null
          meta_valor?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_agentes_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_agentes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_lidas: {
        Row: {
          lida_em: string | null
          notificacao_id: string
          usuario_id: string
        }
        Insert: {
          lida_em?: string | null
          notificacao_id: string
          usuario_id: string
        }
        Update: {
          lida_em?: string | null
          notificacao_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_lidas_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacoes_sistema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_lidas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_sistema: {
        Row: {
          agencia_id: string | null
          ativo: boolean | null
          criado_em: string | null
          destinatario: string | null
          id: string
          mensagem: string
          status_pagamento_alvo: string | null
          tipo: string | null
          titulo: string
        }
        Insert: {
          agencia_id?: string | null
          ativo?: boolean | null
          criado_em?: string | null
          destinatario?: string | null
          id?: string
          mensagem: string
          status_pagamento_alvo?: string | null
          tipo?: string | null
          titulo: string
        }
        Update: {
          agencia_id?: string | null
          ativo?: boolean | null
          criado_em?: string | null
          destinatario?: string | null
          id?: string
          mensagem?: string
          status_pagamento_alvo?: string | null
          tipo?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_sistema_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          agencia_id: string
          aprovado_pelo_cliente_em: string | null
          aprovado_pelo_cliente_nome: string | null
          atualizado_em: string | null
          cliente_id: string | null
          criado_em: string | null
          enviado_whatsapp: boolean | null
          enviado_whatsapp_em: string | null
          forma_pagamento: string | null
          id: string
          lucro_bruto: number | null
          margem_percentual: number | null
          moeda: string | null
          numero_orcamento: string | null
          observacoes: string | null
          pago_em: string | null
          status: string | null
          titulo: string | null
          token_publico: string | null
          usuario_id: string | null
          validade: string | null
          valor_custo: number | null
          valor_final: number | null
        }
        Insert: {
          agencia_id: string
          aprovado_pelo_cliente_em?: string | null
          aprovado_pelo_cliente_nome?: string | null
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          enviado_whatsapp?: boolean | null
          enviado_whatsapp_em?: string | null
          forma_pagamento?: string | null
          id?: string
          lucro_bruto?: number | null
          margem_percentual?: number | null
          moeda?: string | null
          numero_orcamento?: string | null
          observacoes?: string | null
          pago_em?: string | null
          status?: string | null
          titulo?: string | null
          token_publico?: string | null
          usuario_id?: string | null
          validade?: string | null
          valor_custo?: number | null
          valor_final?: number | null
        }
        Update: {
          agencia_id?: string
          aprovado_pelo_cliente_em?: string | null
          aprovado_pelo_cliente_nome?: string | null
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          enviado_whatsapp?: boolean | null
          enviado_whatsapp_em?: string | null
          forma_pagamento?: string | null
          id?: string
          lucro_bruto?: number | null
          margem_percentual?: number | null
          moeda?: string | null
          numero_orcamento?: string | null
          observacoes?: string | null
          pago_em?: string | null
          status?: string | null
          titulo?: string | null
          token_publico?: string | null
          usuario_id?: string | null
          validade?: string | null
          valor_custo?: number | null
          valor_final?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      templates_orcamento: {
        Row: {
          agencia_id: string
          criado_em: string | null
          descricao: string | null
          forma_pagamento: string | null
          id: string
          nome: string
          observacoes: string | null
        }
        Insert: {
          agencia_id: string
          criado_em?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          nome: string
          observacoes?: string | null
        }
        Update: {
          agencia_id?: string
          criado_em?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_orcamento_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_mensagens: {
        Row: {
          criado_em: string
          id: string
          is_superadmin: boolean
          mensagem: string
          ticket_id: string
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          id?: string
          is_superadmin?: boolean
          mensagem: string
          ticket_id: string
          usuario_id: string
        }
        Update: {
          criado_em?: string
          id?: string
          is_superadmin?: boolean
          mensagem?: string
          ticket_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_mensagens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_mensagens_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          agencia_id: string
          assunto: string
          atualizado_em: string
          categoria: string
          criado_em: string
          descricao: string
          id: string
          prioridade: string
          status: string
        }
        Insert: {
          agencia_id: string
          assunto: string
          atualizado_em?: string
          categoria: string
          criado_em?: string
          descricao: string
          id?: string
          prioridade: string
          status?: string
        }
        Update: {
          agencia_id?: string
          assunto?: string
          atualizado_em?: string
          categoria?: string
          criado_em?: string
          descricao?: string
          id?: string
          prioridade?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          agencia_id: string | null
          ativo: boolean | null
          cargo: string | null
          criado_em: string | null
          email: string | null
          email_confirmado: boolean | null
          id: string
          nome: string | null
        }
        Insert: {
          agencia_id?: string | null
          ativo?: boolean | null
          cargo?: string | null
          criado_em?: string | null
          email?: string | null
          email_confirmado?: boolean | null
          id: string
          nome?: string | null
        }
        Update: {
          agencia_id?: string | null
          ativo?: boolean | null
          cargo?: string | null
          criado_em?: string | null
          email?: string | null
          email_confirmado?: boolean | null
          id?: string
          nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: false
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instancias: {
        Row: {
          agencia_id: string
          atualizado_em: string | null
          criado_em: string | null
          id: string
          instance_name: string
          numero: string | null
          status: string | null
          ultima_verificacao: string | null
        }
        Insert: {
          agencia_id: string
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          instance_name: string
          numero?: string | null
          status?: string | null
          ultima_verificacao?: string | null
        }
        Update: {
          agencia_id?: string
          atualizado_em?: string | null
          criado_em?: string | null
          id?: string
          instance_name?: string
          numero?: string | null
          status?: string | null
          ultima_verificacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instancias_agencia_id_fkey"
            columns: ["agencia_id"]
            isOneToOne: true
            referencedRelation: "agencias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_agencia_id: { Args: never; Returns: string }
      is_agency_admin: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
