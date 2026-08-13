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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_id: string
          created_at: string
          id: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          student_id: string
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          school_year: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_year: string
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_year?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      competencies: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          label: string
          position: number
          teacher_id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          label: string
          position?: number
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencies_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_levels: {
        Row: {
          competency_id: string
          created_at: string
          id: string
          label: string
          position: number
          teacher_id: string
          updated_at: string
        }
        Insert: {
          competency_id: string
          created_at?: string
          id?: string
          label: string
          position?: number
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          competency_id?: string
          created_at?: string
          id?: string
          label?: string
          position?: number
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_levels_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
        ]
      }
      program_sessions: {
        Row: {
          activity_id: string | null
          activity_name: string
          class_id: string | null
          created_at: string
          description: string | null
          id: string
          objective: string | null
          period_label: string | null
          session_date: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          activity_id?: string | null
          activity_name?: string
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          objective?: string | null
          period_label?: string | null
          session_date?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string | null
          activity_name?: string
          class_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          objective?: string | null
          period_label?: string | null
          session_date?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      student_competency_levels: {
        Row: {
          competency_id: string
          created_at: string
          id: string
          level_id: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          competency_id: string
          created_at?: string
          id?: string
          level_id: string
          student_id: string
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          competency_id?: string
          created_at?: string
          id?: string
          level_id?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_competency_levels_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_competency_levels_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "competency_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_competency_levels_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_engagement: {
        Row: {
          created_at: string
          id: string
          indicator_code: string
          level: number
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          indicator_code: string
          level: number
          student_id: string
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          indicator_code?: string
          level?: number
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_engagement_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_goal_choices: {
        Row: {
          created_at: string
          goal_code: string
          id: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_code: string
          id?: string
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_code?: string
          id?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_goal_choices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_grade_items: {
        Row: {
          competency_id: string | null
          created_at: string
          grade_id: string
          id: string
          label: string
          max_points: number
          points: number
          position: number
          teacher_id: string
          updated_at: string
        }
        Insert: {
          competency_id?: string | null
          created_at?: string
          grade_id: string
          id?: string
          label?: string
          max_points?: number
          points?: number
          position?: number
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          competency_id?: string | null
          created_at?: string
          grade_id?: string
          id?: string
          label?: string
          max_points?: number
          points?: number
          position?: number
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_grade_items_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grade_items_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "student_grades"
            referencedColumns: ["id"]
          },
        ]
      }
      student_grades: {
        Row: {
          activity_id: string
          comment: string | null
          created_at: string
          evaluated_on: string
          id: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          activity_id: string
          comment?: string | null
          created_at?: string
          evaluated_on?: string
          id?: string
          student_id: string
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          activity_id?: string
          comment?: string | null
          created_at?: string
          evaluated_on?: string
          id?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_grades_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_qr_tokens: {
        Row: {
          active: boolean
          created_at: string
          id: string
          revoked_at: string | null
          student_id: string
          teacher_id: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          revoked_at?: string | null
          student_id: string
          teacher_id?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          revoked_at?: string | null
          student_id?: string
          teacher_id?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_qr_tokens_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_strength_choices: {
        Row: {
          created_at: string
          id: string
          strength_code: string
          student_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          strength_code: string
          student_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          strength_code?: string
          student_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_strength_choices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          first_name: string
          id: string
          last_name: string
          qr_token: string
          student_code: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          qr_token?: string
          student_code?: string
          teacher_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          qr_token?: string
          student_code?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id: string
          last_name?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_student_code: { Args: never; Returns: string }
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
