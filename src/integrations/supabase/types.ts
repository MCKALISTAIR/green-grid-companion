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
      carbon_footprint: {
        Row: {
          carbon_g: number
          consumption_kwh: number
          created_at: string
          id: string
          intensity_gco2_kwh: number
          intensity_index: string
          interval_end: string
          interval_start: string
          mpan: string
        }
        Insert: {
          carbon_g: number
          consumption_kwh: number
          created_at?: string
          id?: string
          intensity_gco2_kwh: number
          intensity_index: string
          interval_end: string
          interval_start: string
          mpan: string
        }
        Update: {
          carbon_g?: number
          consumption_kwh?: number
          created_at?: string
          id?: string
          intensity_gco2_kwh?: number
          intensity_index?: string
          interval_end?: string
          interval_start?: string
          mpan?: string
        }
        Relationships: []
      }
      octopus_consumption: {
        Row: {
          consumption_kwh: number
          created_at: string
          id: string
          interval_end: string
          interval_start: string
          mpan: string
          serial_number: string
        }
        Insert: {
          consumption_kwh: number
          created_at?: string
          id?: string
          interval_end: string
          interval_start: string
          mpan: string
          serial_number: string
        }
        Update: {
          consumption_kwh?: number
          created_at?: string
          id?: string
          interval_end?: string
          interval_start?: string
          mpan?: string
          serial_number?: string
        }
        Relationships: []
      }
      octopus_credentials: {
        Row: {
          account_number: string
          api_key: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          api_key: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          account_number?: string
          api_key?: string
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      octopus_meters: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          mpan: string
          serial_number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          mpan: string
          serial_number: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          mpan?: string
          serial_number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          daily_forecast_enabled: boolean
          daily_forecast_time: string
          device_token: string
          id: string
          low_intensity_enabled: boolean
          low_intensity_threshold: number
          monthly_report_day: number
          monthly_report_enabled: boolean
          platform: string
          postcode: string
          updated_at: string
          weekly_digest_day: number
          weekly_digest_enabled: boolean
        }
        Insert: {
          created_at?: string
          daily_forecast_enabled?: boolean
          daily_forecast_time?: string
          device_token: string
          id?: string
          low_intensity_enabled?: boolean
          low_intensity_threshold?: number
          monthly_report_day?: number
          monthly_report_enabled?: boolean
          platform?: string
          postcode: string
          updated_at?: string
          weekly_digest_day?: number
          weekly_digest_enabled?: boolean
        }
        Update: {
          created_at?: string
          daily_forecast_enabled?: boolean
          daily_forecast_time?: string
          device_token?: string
          id?: string
          low_intensity_enabled?: boolean
          low_intensity_threshold?: number
          monthly_report_day?: number
          monthly_report_enabled?: boolean
          platform?: string
          postcode?: string
          updated_at?: string
          weekly_digest_day?: number
          weekly_digest_enabled?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_credentials_status: {
        Args: never
        Returns: {
          account_number: string
          created_at: string
          has_api_key: boolean
          updated_at: string
          user_id: string
        }[]
      }
      user_owns_mpan: { Args: { check_mpan: string }; Returns: boolean }
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
