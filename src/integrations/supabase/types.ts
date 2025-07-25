export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: Database["public"]["Enums"]["user_role"] | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: Database["public"]["Enums"]["user_role"] | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      candidates: {
        Row: {
          bio: string | null
          created_at: string
          election_id: string
          full_name: string
          id: string
          image_url: string | null
          jhs_graduation_year: number | null
          jhs_school: string | null
          partylist: string | null
          position_id: string
          shs_graduation_year: number | null
          shs_school: string | null
          why_vote_me: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          election_id: string
          full_name: string
          id?: string
          image_url?: string | null
          jhs_graduation_year?: number | null
          jhs_school?: string | null
          partylist?: string | null
          position_id: string
          shs_graduation_year?: number | null
          shs_school?: string | null
          why_vote_me?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          election_id?: string
          full_name?: string
          id?: string
          image_url?: string | null
          jhs_graduation_year?: number | null
          jhs_school?: string | null
          partylist?: string | null
          position_id?: string
          shs_graduation_year?: number | null
          shs_school?: string | null
          why_vote_me?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "candidates_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["position_id"]
          },
          {
            foreignKeyName: "candidates_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_candidates_election"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "fk_candidates_election"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      elections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          eligible_voters: string | null
          end_date: string
          id: string
          show_results_to_voters: boolean
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          eligible_voters?: string | null
          end_date: string
          id?: string
          show_results_to_voters?: boolean
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          eligible_voters?: string | null
          end_date?: string
          id?: string
          show_results_to_voters?: boolean
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pending_actions: {
        Row: {
          action_data: Json
          action_type: string
          admin_notes: string | null
          created_at: string
          id: string
          requested_at: string
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          action_data: Json
          action_type: string
          admin_notes?: string | null
          created_at?: string
          id?: string
          requested_at?: string
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          admin_notes?: string | null
          created_at?: string
          id?: string
          requested_at?: string
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          description: string | null
          election_id: string
          id: string
          max_candidates: number | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          election_id: string
          id?: string
          max_candidates?: number | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          election_id?: string
          id?: string
          max_candidates?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_positions_election"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "fk_positions_election"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "positions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          course: string | null
          created_at: string
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          id_image_url: string | null
          registration_status: string | null
          role: Database["public"]["Enums"]["user_role"]
          student_id: string | null
          updated_at: string
          user_id: string
          year_level: string | null
        }
        Insert: {
          course?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_image_url?: string | null
          registration_status?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          student_id?: string | null
          updated_at?: string
          user_id: string
          year_level?: string | null
        }
        Update: {
          course?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          id_image_url?: string | null
          registration_status?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          student_id?: string | null
          updated_at?: string
          user_id?: string
          year_level?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          candidate_id: string
          created_at: string
          election_id: string
          id: string
          voter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          election_id: string
          id?: string
          voter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          election_id?: string
          id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_votes_candidate"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_votes_candidate"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "fk_votes_election"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "fk_votes_election"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "votes_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
      voting_sessions: {
        Row: {
          created_at: string
          election_id: string
          expires_at: string
          has_voted: boolean
          id: string
          session_token: string
          voter_id: string
        }
        Insert: {
          created_at?: string
          election_id: string
          expires_at?: string
          has_voted?: boolean
          id?: string
          session_token: string
          voter_id: string
        }
        Update: {
          created_at?: string
          election_id?: string
          expires_at?: string
          has_voted?: boolean
          id?: string
          session_token?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_voting_sessions_election"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "fk_voting_sessions_election"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voting_sessions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "election_results"
            referencedColumns: ["election_id"]
          },
          {
            foreignKeyName: "voting_sessions_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "elections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      election_results: {
        Row: {
          candidate_id: string | null
          candidate_name: string | null
          election_id: string | null
          election_title: string | null
          position_id: string | null
          position_title: string | null
          vote_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_pending_action: {
        Args: { p_action_id: string; p_admin_notes?: string }
        Returns: boolean
      }
      approve_user_registration: {
        Args: { p_user_id: string; p_admin_notes?: string }
        Returns: boolean
      }
      auto_update_election_statuses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_user_vote_in_election: {
        Args: { p_user_id: string; p_election_id: string }
        Returns: boolean
      }
      cast_anonymous_vote: {
        Args: {
          p_session_token: string
          p_candidate_id: string
          p_election_id: string
          p_position_id: string
        }
        Returns: boolean
      }
      check_duplicate_user: {
        Args: { p_email: string; p_student_id: string }
        Returns: Json
      }
      check_user_role: {
        Args: { _user_id: string; _role: string }
        Returns: boolean
      }
      create_voting_session: {
        Args: { p_election_id: string }
        Returns: string
      }
      create_voting_session_safe: {
        Args: { p_election_id: string }
        Returns: Json
      }
      get_all_election_results_optimized: {
        Args: Record<PropertyKey, never>
        Returns: {
          election_id: string
          election_title: string
          election_status: string
          eligible_voters: string
          show_results_to_voters: boolean
          position_id: string
          position_title: string
          candidate_id: string
          candidate_name: string
          vote_count: number
          total_votes_in_position: number
          total_eligible_voters_count: number
          percentage: number
        }[]
      }
      get_election_results: {
        Args: { p_election_id: string }
        Returns: {
          election_id: string
          election_title: string
          position_id: string
          position_title: string
          candidate_id: string
          candidate_name: string
          vote_count: number
        }[]
      }
      get_election_results_with_stats: {
        Args: { p_election_id: string }
        Returns: {
          election_id: string
          election_title: string
          election_status: string
          eligible_voters: string
          position_id: string
          position_title: string
          candidate_id: string
          candidate_name: string
          vote_count: number
          total_votes_in_position: number
          percentage: number
        }[]
      }
      get_email_by_student_id: {
        Args: { _student_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      log_audit_action: {
        Args: {
          p_actor_id: string
          p_actor_role: Database["public"]["Enums"]["user_role"]
          p_action: string
          p_resource_type?: string
          p_resource_id?: string
          p_details?: Json
        }
        Returns: undefined
      }
      reject_pending_action: {
        Args: { p_action_id: string; p_admin_notes?: string }
        Returns: boolean
      }
      reject_user_registration: {
        Args: { p_user_id: string; p_admin_notes?: string }
        Returns: boolean
      }
      submit_user_appeal: {
        Args: {
          p_user_id: string
          p_new_student_id: string
          p_new_full_name: string
          p_new_course: string
          p_new_year_level: string
          p_new_gender: string
          p_new_id_image_url: string
        }
        Returns: boolean
      }
      update_election_statuses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_role: {
        Args: {
          p_user_id: string
          p_new_role: Database["public"]["Enums"]["user_role"]
          p_admin_notes?: string
        }
        Returns: boolean
      }
      user_has_role: {
        Args: { role_name: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "Voter" | "Staff" | "Administrator"
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
      user_role: ["Voter", "Staff", "Administrator"],
    },
  },
} as const
