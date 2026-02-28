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
          ativo: boolean | null
          cnpj: string | null
          criado_em: string | null
          email: string | null
          id: string
          nome_fantasia: string
          onboarding_completo: boolean | null
          plano: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          criado_em?: string | null
          email?: string | null
          id?: string
          nome_fantasia: string
          onboarding_completo?: boolean | null
          plano?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          criado_em?: string | null
          email?: string | null
          id?: string
          nome_fantasia?: string
          onboarding_completo?: boolean | null
          plano?: string | null
          telefone?: string | null
        }
        Relationships: []
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
      itens_orcamento: {
        Row: {
          descricao: string | null
          detalhes: Json | null
          id: string
          markup_percentual: number | null
          orcamento_id: string
          quantidade: number | null
          taxa_fixa: number | null
          tipo: string
          valor_custo: number | null
          valor_final: number | null
        }
        Insert: {
          descricao?: string | null
          detalhes?: Json | null
          id?: string
          markup_percentual?: number | null
          orcamento_id: string
          quantidade?: number | null
          taxa_fixa?: number | null
          tipo: string
          valor_custo?: number | null
          valor_final?: number | null
        }
        Update: {
          descricao?: string | null
          detalhes?: Json | null
          id?: string
          markup_percentual?: number | null
          orcamento_id?: string
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
      orcamentos: {
        Row: {
          agencia_id: string
          atualizado_em: string | null
          cliente_id: string | null
          criado_em: string | null
          forma_pagamento: string | null
          id: string
          lucro_bruto: number | null
          margem_percentual: number | null
          moeda: string | null
          observacoes: string | null
          status: string | null
          titulo: string | null
          usuario_id: string | null
          validade: string | null
          valor_custo: number | null
          valor_final: number | null
        }
        Insert: {
          agencia_id: string
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          forma_pagamento?: string | null
          id?: string
          lucro_bruto?: number | null
          margem_percentual?: number | null
          moeda?: string | null
          observacoes?: string | null
          status?: string | null
          titulo?: string | null
          usuario_id?: string | null
          validade?: string | null
          valor_custo?: number | null
          valor_final?: number | null
        }
        Update: {
          agencia_id?: string
          atualizado_em?: string | null
          cliente_id?: string | null
          criado_em?: string | null
          forma_pagamento?: string | null
          id?: string
          lucro_bruto?: number | null
          margem_percentual?: number | null
          moeda?: string | null
          observacoes?: string | null
          status?: string | null
          titulo?: string | null
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
      usuarios: {
        Row: {
          agencia_id: string | null
          ativo: boolean | null
          cargo: string | null
          criado_em: string | null
          email: string | null
          id: string
          nome: string | null
        }
        Insert: {
          agencia_id?: string | null
          ativo?: boolean | null
          cargo?: string | null
          criado_em?: string | null
          email?: string | null
          id: string
          nome?: string | null
        }
        Update: {
          agencia_id?: string | null
          ativo?: boolean | null
          cargo?: string | null
          criado_em?: string | null
          email?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_agencia_id: { Args: never; Returns: string }
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
