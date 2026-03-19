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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder: string
          bank_name: string
          created_at: string
          currency: string
          iban: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          account_holder: string
          bank_name: string
          created_at?: string
          currency?: string
          iban: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          account_holder?: string
          bank_name?: string
          created_at?: string
          currency?: string
          iban?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      candles: {
        Row: {
          bucket_time: string
          close: number
          created_at: string
          high: number
          id: string
          low: number
          open: number
          symbol_id: string
          timeframe: string
          volume: number
        }
        Insert: {
          bucket_time: string
          close?: number
          created_at?: string
          high?: number
          id?: string
          low?: number
          open?: number
          symbol_id: string
          timeframe?: string
          volume?: number
        }
        Update: {
          bucket_time?: string
          close?: number
          created_at?: string
          high?: number
          id?: string
          low?: number
          open?: number
          symbol_id?: string
          timeframe?: string
          volume?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          close_reason: string | null
          closed_at: string | null
          created_at: string
          current_price: number
          entry_price: number
          id: string
          leverage: string
          lots: number
          order_type: string
          pnl: number
          status: string
          stop_loss: number | null
          swap: number
          symbol_id: string
          symbol_name: string
          take_profit: number | null
          target_price: number | null
          type: string
          user_id: string
        }
        Insert: {
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          current_price: number
          entry_price: number
          id?: string
          leverage?: string
          lots: number
          order_type?: string
          pnl?: number
          status?: string
          stop_loss?: number | null
          swap?: number
          symbol_id: string
          symbol_name: string
          take_profit?: number | null
          target_price?: number | null
          type: string
          user_id: string
        }
        Update: {
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          current_price?: number
          entry_price?: number
          id?: string
          leverage?: string
          lots?: number
          order_type?: string
          pnl?: number
          status?: string
          stop_loss?: number | null
          swap?: number
          symbol_id?: string
          symbol_name?: string
          take_profit?: number | null
          target_price?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          balance: number
          ban_reason: string | null
          ban_type: string
          birth_date: string | null
          country: string | null
          created_at: string
          credit: number
          equity: number
          free_margin: number
          full_name: string | null
          id: string
          is_banned: boolean
          leverage: string
          margin_call_notified: boolean
          meta_id: number
          phone: string | null
          referral_code: string | null
          tc_identity: string | null
          updated_at: string
          user_id: string
          verification_status: string
        }
        Insert: {
          account_type?: string
          balance?: number
          ban_reason?: string | null
          ban_type?: string
          birth_date?: string | null
          country?: string | null
          created_at?: string
          credit?: number
          equity?: number
          free_margin?: number
          full_name?: string | null
          id?: string
          is_banned?: boolean
          leverage?: string
          margin_call_notified?: boolean
          meta_id?: number
          phone?: string | null
          referral_code?: string | null
          tc_identity?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string
        }
        Update: {
          account_type?: string
          balance?: number
          ban_reason?: string | null
          ban_type?: string
          birth_date?: string | null
          country?: string | null
          created_at?: string
          credit?: number
          equity?: number
          free_margin?: number
          full_name?: string | null
          id?: string
          is_banned?: boolean
          leverage?: string
          margin_call_notified?: boolean
          meta_id?: number
          phone?: string | null
          referral_code?: string | null
          tc_identity?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          updated_at: string
          usage_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          usage_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      symbols: {
        Row: {
          category: string
          change_percent: number | null
          created_at: string
          current_price: number | null
          description: string | null
          display_name: string
          exchange: string | null
          high: number | null
          id: string
          is_active: boolean
          low: number | null
          name: string
          updated_at: string
          volume: number | null
        }
        Insert: {
          category?: string
          change_percent?: number | null
          created_at?: string
          current_price?: number | null
          description?: string | null
          display_name: string
          exchange?: string | null
          high?: number | null
          id?: string
          is_active?: boolean
          low?: number | null
          name: string
          updated_at?: string
          volume?: number | null
        }
        Update: {
          category?: string
          change_percent?: number | null
          created_at?: string
          current_price?: number | null
          description?: string | null
          display_name?: string
          exchange?: string | null
          high?: number | null
          id?: string
          is_active?: boolean
          low?: number | null
          name?: string
          updated_at?: string
          volume?: number | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_holder: string | null
          amount: number
          created_at: string
          currency: string
          description: string | null
          exchange_rate: number | null
          iban: string | null
          id: string
          method: string | null
          original_amount: number | null
          original_currency: string | null
          receipt_url: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          exchange_rate?: number | null
          iban?: string | null
          id?: string
          method?: string | null
          original_amount?: number | null
          original_currency?: string | null
          receipt_url?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          exchange_rate?: number | null
          iban?: string | null
          id?: string
          method?: string | null
          original_amount?: number | null
          original_currency?: string | null
          receipt_url?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_position: {
        Args: {
          p_close_price: number
          p_close_reason?: string
          p_net_pnl: number
          p_order_id: string
          p_swap: number
        }
        Returns: Json
      }
      generate_random_meta_id: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_referral_usage: {
        Args: { p_code_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
