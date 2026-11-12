// Generated from the live Supabase schema — do not edit by hand.
// Regenerate with: npx supabase gen types typescript --project-id avlybhdtpgnynjffgofv > src/lib/database.types.ts

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      exercises: {
        Row: {
          alternate_1: string | null
          alternate_2: string | null
          equipment: string | null
          form_note: string | null
          id: string
          instructions: string | null
          is_bodyweight: boolean
          muscle_group: string
          name: string
          rest_max: number
          rest_min: number
          warmup_protocol: string
          weight_per_side: boolean
          youtube_url: string | null
        }
        Insert: {
          alternate_1?: string | null
          alternate_2?: string | null
          equipment?: string | null
          form_note?: string | null
          id: string
          instructions?: string | null
          is_bodyweight?: boolean
          muscle_group: string
          name: string
          rest_max: number
          rest_min: number
          warmup_protocol: string
          weight_per_side?: boolean
          youtube_url?: string | null
        }
        Update: {
          alternate_1?: string | null
          alternate_2?: string | null
          equipment?: string | null
          form_note?: string | null
          id?: string
          instructions?: string | null
          is_bodyweight?: boolean
          muscle_group?: string
          name?: string
          rest_max?: number
          rest_min?: number
          warmup_protocol?: string
          weight_per_side?: boolean
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_warmup_protocol_fkey"
            columns: ["warmup_protocol"]
            isOneToOne: false
            referencedRelation: "warmup_protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      failure_techniques: {
        Row: {
          description: string
          id: string
          label: string
        }
        Insert: {
          description: string
          id: string
          label: string
        }
        Update: {
          description?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      program_day_exercises: {
        Row: {
          early_set_count: number
          early_set_rpe_max: number
          early_set_rpe_min: number
          exercise_id: string
          id: string
          last_set_count: number
          last_set_rpe_max: number | null
          last_set_rpe_min: number | null
          last_set_target: string
          position: number
          program_day_id: string
          rep_range_max: number
          rep_range_min: number
        }
        Insert: {
          early_set_count?: number
          early_set_rpe_max: number
          early_set_rpe_min: number
          exercise_id: string
          id?: string
          last_set_count?: number
          last_set_rpe_max?: number | null
          last_set_rpe_min?: number | null
          last_set_target?: string
          position: number
          program_day_id: string
          rep_range_max: number
          rep_range_min: number
        }
        Update: {
          early_set_count?: number
          early_set_rpe_max?: number
          early_set_rpe_min?: number
          exercise_id?: string
          id?: string
          last_set_count?: number
          last_set_rpe_max?: number | null
          last_set_rpe_min?: number | null
          last_set_target?: string
          position?: number
          program_day_id?: string
          rep_range_max?: number
          rep_range_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_last_set_target"
            columns: ["last_set_target"]
            isOneToOne: false
            referencedRelation: "failure_techniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_day_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_day_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      program_days: {
        Row: {
          day_index: number
          day_type: string
          id: string
          program_id: string
          week: number
        }
        Insert: {
          day_index: number
          day_type: string
          id?: string
          program_id: string
          week: number
        }
        Update: {
          day_index?: number
          day_type?: string
          id?: string
          program_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean
          name: string
          total_weeks: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          total_weeks?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          total_weeks?: number
        }
        Relationships: []
      }
      set_logs: {
        Row: {
          exercise_id: string
          failure_hit: boolean | null
          id: string
          is_last_set: boolean
          logged_at: string
          reps: number
          rpe: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg: number
        }
        Insert: {
          exercise_id: string
          failure_hit?: boolean | null
          id?: string
          is_last_set?: boolean
          logged_at?: string
          reps: number
          rpe?: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg: number
        }
        Update: {
          exercise_id?: string
          failure_hit?: boolean | null
          id?: string
          is_last_set?: boolean
          logged_at?: string
          reps?: number
          rpe?: number | null
          session_id?: string
          set_index?: number
          user_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          alternate_selections: Json
          body_weight_kg: number | null
          created_at: string
          exercise_notes: Json
          height_cm: number | null
          id: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alternate_selections?: Json
          body_weight_kg?: number | null
          created_at?: string
          exercise_notes?: Json
          height_cm?: number | null
          id?: string
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alternate_selections?: Json
          body_weight_kg?: number | null
          created_at?: string
          exercise_notes?: Json
          height_cm?: number | null
          id?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      warmup_protocols: {
        Row: {
          id: string
          steps: string[]
        }
        Insert: {
          id: string
          steps?: string[]
        }
        Update: {
          id?: string
          steps?: string[]
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          current_exercise_index: number
          current_set_index: number
          day_index: number
          day_type: string
          id: string
          program_id: string | null
          started_at: string
          user_id: string
          week: number
        }
        Insert: {
          completed_at?: string | null
          current_exercise_index?: number
          current_set_index?: number
          day_index: number
          day_type: string
          id?: string
          program_id?: string | null
          started_at?: string
          user_id: string
          week: number
        }
        Update: {
          completed_at?: string | null
          current_exercise_index?: number
          current_set_index?: number
          day_index?: number
          day_type?: string
          id?: string
          program_id?: string | null
          started_at?: string
          user_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      duplicate_program_week: {
        Args: {
          p_new_total_weeks: number
          p_program_id: string
          p_source_week: number
          p_target_week: number
        }
        Returns: undefined
      }
      last_sets_for_exercises: {
        Args: { p_exercise_ids: string[] }
        Returns: {
          exercise_id: string
          failure_hit: boolean | null
          id: string
          is_last_set: boolean
          logged_at: string
          reps: number
          rpe: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg: number
        }[]
        SetofOptions: {
          from: "*"
          to: "set_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      log_set: {
        Args: {
          p_complete: boolean
          p_exercise_id: string
          p_failure_hit: boolean
          p_id: string
          p_is_last_set: boolean
          p_next_exercise_index: number
          p_next_set_index: number
          p_reps: number
          p_rpe: number
          p_session_id: string
          p_set_index: number
          p_weight_kg: number
        }
        Returns: {
          exercise_id: string
          failure_hit: boolean | null
          id: string
          is_last_set: boolean
          logged_at: string
          reps: number
          rpe: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg: number
        }
        SetofOptions: {
          from: "*"
          to: "set_logs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      program_user_counts: {
        Args: { p_program_ids: string[] }
        Returns: {
          program_id: string
          user_count: number
        }[]
      }
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
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][T]["Update"]
