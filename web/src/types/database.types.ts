export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_ref: string
          commission_amount_snapshot: number
          court_id: string
          created_at: string
          customer_id: string
          id: string
          payment_gateway_ref: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          slot_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_charged: number
          updated_at: string
          venue_id: string
          venue_payout_amount: number
        }
        Insert: {
          booking_ref: string
          commission_amount_snapshot?: number
          court_id: string
          created_at?: string
          customer_id: string
          id?: string
          payment_gateway_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_charged: number
          updated_at?: string
          venue_id: string
          venue_payout_amount: number
        }
        Update: {
          booking_ref?: string
          commission_amount_snapshot?: number
          court_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          payment_gateway_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          slot_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_charged?: number
          updated_at?: string
          venue_id?: string
          venue_payout_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          metadata: Json
          name: string
          sport_id: string | null
          sport_type: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          hourly_rate?: number
          id?: string
          metadata?: Json
          name: string
          sport_id?: string | null
          sport_type?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          metadata?: Json
          name?: string
          sport_id?: string | null
          sport_type?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name: string
          phone: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      slots: {
        Row: {
          court_id: string
          date: string
          end_time: string
          held_by: string | null
          held_until: string | null
          id: string
          start_time: string
          status: Database["public"]["Enums"]["slot_status"]
        }
        Insert: {
          court_id: string
          date: string
          end_time: string
          held_by?: string | null
          held_until?: string | null
          id?: string
          start_time: string
          status?: Database["public"]["Enums"]["slot_status"]
        }
        Update: {
          court_id?: string
          date?: string
          end_time?: string
          held_by?: string | null
          held_until?: string | null
          id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["slot_status"]
        }
        Relationships: [
          {
            foreignKeyName: "slots_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_held_by_fkey"
            columns: ["held_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          amenities: Json
          area_id: string | null
          avg_rating: number
          coordinates: unknown
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          slug: string
          status: Database["public"]["Enums"]["venue_status"]
          updated_at: string
        }
        Insert: {
          address: string
          amenities?: Json
          area_id?: string | null
          avg_rating?: number
          coordinates: unknown
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          slug: string
          status?: Database["public"]["Enums"]["venue_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: Json
          area_id?: string | null
          avg_rating?: number
          coordinates?: unknown
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["venue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      hold_slot: {
        Args: { p_court_id: string; p_date: string; p_start_time: string }
        Returns: {
          held_until: string
          slot_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      booking_status:
        | "confirmed"
        | "completed"
        | "cancelled_by_customer"
        | "cancelled_by_venue"
        | "no_show"
      media_status: "pending" | "approved" | "rejected"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      slot_status: "available" | "held" | "booked" | "blocked" | "maintenance"
      user_role:
        | "customer"
        | "venue_owner"
        | "venue_staff"
        | "admin"
        | "super_admin"
      venue_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "published"
        | "rejected"
        | "suspended"
        | "archived"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      booking_status: [
        "confirmed",
        "completed",
        "cancelled_by_customer",
        "cancelled_by_venue",
        "no_show",
      ],
      media_status: ["pending", "approved", "rejected"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      slot_status: ["available", "held", "booked", "blocked", "maintenance"],
      user_role: [
        "customer",
        "venue_owner",
        "venue_staff",
        "admin",
        "super_admin",
      ],
      venue_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "published",
        "rejected",
        "suspended",
        "archived",
      ],
    },
  },
} as const

