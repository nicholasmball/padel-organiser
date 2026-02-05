export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          skill_level: "beginner" | "intermediate" | "advanced" | "pro" | null;
          avatar_url: string | null;
          email_notifications: boolean;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          skill_level?:
            | "beginner"
            | "intermediate"
            | "advanced"
            | "pro"
            | null;
          avatar_url?: string | null;
          email_notifications?: boolean;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          skill_level?:
            | "beginner"
            | "intermediate"
            | "advanced"
            | "pro"
            | null;
          avatar_url?: string | null;
          email_notifications?: boolean;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      availability: {
        Row: {
          id: string;
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      unavailable_dates: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "unavailable_dates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      bookings: {
        Row: {
          id: string;
          organiser_id: string;
          venue_name: string;
          venue_address: string | null;
          venue_lat: number | null;
          venue_lng: number | null;
          court_number: string | null;
          is_outdoor: boolean;
          date: string;
          start_time: string;
          end_time: string;
          total_cost: number;
          max_players: number;
          notes: string | null;
          status: "open" | "full" | "confirmed" | "completed" | "cancelled";
          signup_deadline: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organiser_id: string;
          venue_name: string;
          venue_address?: string | null;
          venue_lat?: number | null;
          venue_lng?: number | null;
          court_number?: string | null;
          is_outdoor?: boolean;
          date: string;
          start_time: string;
          end_time: string;
          total_cost?: number;
          max_players?: number;
          notes?: string | null;
          status?: "open" | "full" | "confirmed" | "completed" | "cancelled";
          signup_deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organiser_id?: string;
          venue_name?: string;
          venue_address?: string | null;
          venue_lat?: number | null;
          venue_lng?: number | null;
          court_number?: string | null;
          is_outdoor?: boolean;
          date?: string;
          start_time?: string;
          end_time?: string;
          total_cost?: number;
          max_players?: number;
          notes?: string | null;
          status?: "open" | "full" | "confirmed" | "completed" | "cancelled";
          signup_deadline?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_organiser_id_fkey";
            columns: ["organiser_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      signups: {
        Row: {
          id: string;
          booking_id: string;
          user_id: string;
          status: "confirmed" | "waitlist" | "interested";
          position: number | null;
          payment_status: "unpaid" | "paid";
          signed_up_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          user_id: string;
          status?: "confirmed" | "waitlist" | "interested";
          position?: number | null;
          payment_status?: "unpaid" | "paid";
          signed_up_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          user_id?: string;
          status?: "confirmed" | "waitlist" | "interested";
          position?: number | null;
          payment_status?: "unpaid" | "paid";
          signed_up_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "signups_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "signups_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          booking_id: string;
          user_id: string;
          content: string;
          is_pinned: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          user_id: string;
          content: string;
          is_pinned?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          user_id?: string;
          content?: string;
          is_pinned?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          booking_id: string | null;
          type: string;
          title: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          booking_id?: string | null;
          type: string;
          title: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          booking_id?: string | null;
          type?: string;
          title?: string;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };
      weather_cache: {
        Row: {
          id: string;
          lat: number;
          lng: number;
          date: string;
          forecast_data: Record<string, unknown>;
          fetched_at: string;
        };
        Insert: {
          id?: string;
          lat: number;
          lng: number;
          date: string;
          forecast_data: Record<string, unknown>;
          fetched_at?: string;
        };
        Update: {
          id?: string;
          lat?: number;
          lng?: number;
          date?: string;
          forecast_data?: Record<string, unknown>;
          fetched_at?: string;
        };
        Relationships: [];
      };
      blacklist: {
        Row: {
          id: string;
          email: string;
          reason: string | null;
          blacklisted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          reason?: string | null;
          blacklisted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          reason?: string | null;
          blacklisted_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blacklist_blacklisted_by_fkey";
            columns: ["blacklisted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
