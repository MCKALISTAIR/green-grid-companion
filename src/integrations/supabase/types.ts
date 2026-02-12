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
      octopus_intelligent_dispatches: {
        Row: {
          avg_intensity_gco2: number | null
          carbon_saved_g: number | null
          carbon_used_g: number | null
          charge_kwh: number | null
          created_at: string
          dispatch_type: string
          end_time: string
          id: string
          location: string | null
          mpan: string
          notified_at: string | null
          source: string | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_intensity_gco2?: number | null
          carbon_saved_g?: number | null
          carbon_used_g?: number | null
          charge_kwh?: number | null
          created_at?: string
          dispatch_type: string
          end_time: string
          id?: string
          location?: string | null
          mpan: string
          notified_at?: string | null
          source?: string | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_intensity_gco2?: number | null
          carbon_saved_g?: number | null
          carbon_used_g?: number | null
          charge_kwh?: number | null
          created_at?: string
          dispatch_type?: string
          end_time?: string
          id?: string
          location?: string | null
          mpan?: string
          notified_at?: string | null
          source?: string | null
          start_time?: string
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
          meter_type: string
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
          meter_type?: string
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
          meter_type?: string
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
          high_intensity_enabled: boolean
          high_intensity_threshold: number
          id: string
          last_high_intensity_state: string | null
          last_intensity_state: string | null
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
          high_intensity_enabled?: boolean
          high_intensity_threshold?: number
          id?: string
          last_high_intensity_state?: string | null
          last_intensity_state?: string | null
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
          high_intensity_enabled?: boolean
          high_intensity_threshold?: number
          id?: string
          last_high_intensity_state?: string | null
          last_intensity_state?: string | null
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
      tesla_charging_sessions: {
        Row: {
          avg_intensity_gco2: number | null
          carbon_saved_vs_avg_g: number | null
          carbon_used_g: number | null
          created_at: string
          end_battery_pct: number | null
          ended_at: string | null
          energy_added_kwh: number
          id: string
          start_battery_pct: number | null
          started_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          avg_intensity_gco2?: number | null
          carbon_saved_vs_avg_g?: number | null
          carbon_used_g?: number | null
          created_at?: string
          end_battery_pct?: number | null
          ended_at?: string | null
          energy_added_kwh?: number
          id?: string
          start_battery_pct?: number | null
          started_at: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          avg_intensity_gco2?: number | null
          carbon_saved_vs_avg_g?: number | null
          carbon_used_g?: number | null
          created_at?: string
          end_battery_pct?: number | null
          ended_at?: string | null
          energy_added_kwh?: number
          id?: string
          start_battery_pct?: number | null
          started_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      tesla_credentials: {
        Row: {
          access_token: string
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tesla_energy_data: {
        Row: {
          battery_charge_kwh: number
          battery_discharge_kwh: number
          carbon_offset_g: number | null
          created_at: string
          grid_export_kwh: number
          grid_import_kwh: number
          id: string
          intensity_gco2_kwh: number | null
          site_id: string
          solar_generation_kwh: number
          timestamp: string
          user_id: string
        }
        Insert: {
          battery_charge_kwh?: number
          battery_discharge_kwh?: number
          carbon_offset_g?: number | null
          created_at?: string
          grid_export_kwh?: number
          grid_import_kwh?: number
          id?: string
          intensity_gco2_kwh?: number | null
          site_id: string
          solar_generation_kwh?: number
          timestamp: string
          user_id: string
        }
        Update: {
          battery_charge_kwh?: number
          battery_discharge_kwh?: number
          carbon_offset_g?: number | null
          created_at?: string
          grid_export_kwh?: number
          grid_import_kwh?: number
          id?: string
          intensity_gco2_kwh?: number | null
          site_id?: string
          solar_generation_kwh?: number
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      tesla_energy_sites: {
        Row: {
          battery_capacity_kwh: number | null
          created_at: string
          id: string
          site_id: string
          site_name: string | null
          solar_capacity_kw: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          battery_capacity_kwh?: number | null
          created_at?: string
          id?: string
          site_id: string
          site_name?: string | null
          solar_capacity_kw?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          battery_capacity_kwh?: number | null
          created_at?: string
          id?: string
          site_id?: string
          site_name?: string | null
          solar_capacity_kw?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tesla_vehicles: {
        Row: {
          battery_capacity_kwh: number | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
          vehicle_id: string
          vin: string | null
        }
        Insert: {
          battery_capacity_kwh?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          vehicle_id: string
          vin?: string | null
        }
        Update: {
          battery_capacity_kwh?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          vehicle_id?: string
          vin?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          recent_locations: Json
          saved_locations: Json
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          recent_locations?: Json
          saved_locations?: Json
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          recent_locations?: Json
          saved_locations?: Json
          settings?: Json
          updated_at?: string
          user_id?: string
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
      has_tesla_linked: { Args: never; Returns: boolean }
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
