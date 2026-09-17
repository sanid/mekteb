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
      announcements: {
        Row: {
          audience: "mosque" | "group"
          author_profile_id: string | null
          body: string
          created_at: string
          created_by: string | null
          group_id: string | null
          id: string
          is_published: boolean
          mosque_id: string
          published_at: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience?: "mosque" | "group"
          author_profile_id?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          is_published?: boolean
          mosque_id: string
          published_at?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience?: "mosque" | "group"
          author_profile_id?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          is_published?: boolean
          mosque_id?: string
          published_at?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mosque_id: string
          note: string | null
          session_id: string
          status: "present" | "absent" | "late" | "excused"
          student_profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mosque_id: string
          note?: string | null
          session_id: string
          status: "present" | "absent" | "late" | "excused"
          student_profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mosque_id?: string
          note?: string | null
          session_id?: string
          status?: "present" | "absent" | "late" | "excused"
          student_profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          checkin_active: boolean
          checkin_opened_at: string | null
          checkin_token: string | null
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          mosque_id: string
          notes: string | null
          session_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          checkin_active?: boolean
          checkin_opened_at?: string | null
          checkin_token?: string | null
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          mosque_id: string
          notes?: string | null
          session_date: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          checkin_active?: boolean
          checkin_opened_at?: string | null
          checkin_token?: string | null
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          mosque_id?: string
          notes?: string | null
          session_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          mosque_id: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          mosque_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          mosque_id?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          date: string
          description: string | null
          end_time: string
          id: string
          mosque_id: string
          start_time: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          end_time?: string
          id?: string
          mosque_id: string
          start_time?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          end_time?: string
          id?: string
          mosque_id?: string
          start_time?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          app_version: string | null
          bundle_id: string | null
          created_at: string
          created_by: string
          device_model: string | null
          id: string
          last_seen_at: string
          locale: string | null
          mosque_id: string
          platform: "ios" | "android" | "web"
          token: string
          updated_at: string
          updated_by: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          bundle_id?: string | null
          created_at?: string
          created_by: string
          device_model?: string | null
          id?: string
          last_seen_at?: string
          locale?: string | null
          mosque_id: string
          platform: "ios" | "android" | "web"
          token: string
          updated_at?: string
          updated_by: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          bundle_id?: string | null
          created_at?: string
          created_by?: string
          device_model?: string | null
          id?: string
          last_seen_at?: string
          locale?: string | null
          mosque_id?: string
          platform?: "ios" | "android" | "web"
          token?: string
          updated_at?: string
          updated_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      diploma_templates: {
        Row: {
          background_image_url: string | null
          created_at: string
          elements: Json
          id: string
          is_active: boolean
          mosque_id: string
          name: string
          orientation: string
          system_key: string | null
          updated_at: string
        }
        Insert: {
          background_image_url?: string | null
          created_at?: string
          elements?: Json
          id?: string
          is_active?: boolean
          mosque_id: string
          name: string
          orientation?: string
          system_key?: string | null
          updated_at?: string
        }
        Update: {
          background_image_url?: string | null
          created_at?: string
          elements?: Json
          id?: string
          is_active?: boolean
          mosque_id?: string
          name?: string
          orientation?: string
          system_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diploma_templates_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_requests: {
        Row: {
          child_birth_year: number | null
          child_name: string
          created_at: string
          id: string
          message: string | null
          mosque_id: string
          parent_email: string
          parent_name: string
          parent_phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: "pending" | "approved" | "rejected"
          updated_at: string
        }
        Insert: {
          child_birth_year?: number | null
          child_name: string
          created_at?: string
          id?: string
          message?: string | null
          mosque_id: string
          parent_email: string
          parent_name: string
          parent_phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: "pending" | "approved" | "rejected"
          updated_at?: string
        }
        Update: {
          child_birth_year?: number | null
          child_name?: string
          created_at?: string
          id?: string
          message?: string | null
          mosque_id?: string
          parent_email?: string
          parent_name?: string
          parent_phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: "pending" | "approved" | "rejected"
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_requests_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_lesson_results: {
        Row: {
          created_at: string
          created_by: string | null
          exam_session_id: string
          id: string
          lesson_id: string
          mosque_id: string
          passed: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exam_session_id: string
          id?: string
          lesson_id: string
          mosque_id: string
          passed?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exam_session_id?: string
          id?: string
          lesson_id?: string
          mosque_id?: string
          passed?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_lesson_results_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_lesson_results_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_lesson_results_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: string
          id: string
          is_active: boolean
          mosque_id: string
          question_text: string
          topic_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean
          mosque_id: string
          question_text: string
          topic_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: string
          id?: string
          is_active?: boolean
          mosque_id?: string
          question_text?: string
          topic_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_requests: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          mosque_id: string
          notes: string | null
          requested_by: string
          status: string
          student_profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          mosque_id: string
          notes?: string | null
          requested_by: string
          status?: string
          student_profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          mosque_id?: string
          notes?: string | null
          requested_by?: string
          status?: string
          student_profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_requests_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_requests_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          diploma_generated_at: string | null
          exam_date: string
          exam_request_id: string | null
          examiner_profile_id: string
          from_group_id: string
          id: string
          mosque_id: string
          oral_passed: boolean | null
          oral_required: boolean
          proposed_by: string | null
          proposed_date: string | null
          retake_of_session_id: string | null
          schedule_status: string
          status: string
          student_profile_id: string
          summary: string | null
          to_group_id: string | null
          updated_at: string
          updated_by: string | null
          written_passed: boolean | null
          written_required: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          diploma_generated_at?: string | null
          exam_date?: string
          exam_request_id?: string | null
          examiner_profile_id: string
          from_group_id: string
          id?: string
          mosque_id: string
          oral_passed?: boolean | null
          oral_required?: boolean
          proposed_by?: string | null
          proposed_date?: string | null
          retake_of_session_id?: string | null
          schedule_status?: string
          status?: string
          student_profile_id: string
          summary?: string | null
          to_group_id?: string | null
          updated_at?: string
          updated_by?: string | null
          written_passed?: boolean | null
          written_required?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          diploma_generated_at?: string | null
          exam_date?: string
          exam_request_id?: string | null
          examiner_profile_id?: string
          from_group_id?: string
          id?: string
          mosque_id?: string
          oral_passed?: boolean | null
          oral_required?: boolean
          proposed_by?: string | null
          proposed_date?: string | null
          retake_of_session_id?: string | null
          schedule_status?: string
          status?: string
          student_profile_id?: string
          summary?: string | null
          to_group_id?: string | null
          updated_at?: string
          updated_by?: string | null
          written_passed?: boolean | null
          written_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "exam_sessions_exam_request_id_fkey"
            columns: ["exam_request_id"]
            isOneToOne: false
            referencedRelation: "exam_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_examiner_profile_id_fkey"
            columns: ["examiner_profile_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_from_group_id_fkey"
            columns: ["from_group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_from_group_id_fkey"
            columns: ["from_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_retake_of_session_id_fkey"
            columns: ["retake_of_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_to_group_id_fkey"
            columns: ["to_group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_sessions_to_group_id_fkey"
            columns: ["to_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      gdpr_deletion_log: {
        Row: {
          deletion_completed_at: string | null
          deletion_started_at: string
          id: string
          mosque_id: string
          mosque_name: string
          mosque_slug: string
          notes: string | null
          requested_by_email: string
          storage_files_deleted: number
          stripe_customer_deleted: boolean
        }
        Insert: {
          deletion_completed_at?: string | null
          deletion_started_at?: string
          id?: string
          mosque_id: string
          mosque_name: string
          mosque_slug: string
          notes?: string | null
          requested_by_email: string
          storage_files_deleted?: number
          stripe_customer_deleted?: boolean
        }
        Update: {
          deletion_completed_at?: string | null
          deletion_started_at?: string
          id?: string
          mosque_id?: string
          mosque_name?: string
          mosque_slug?: string
          notes?: string | null
          requested_by_email?: string
          storage_files_deleted?: number
          stripe_customer_deleted?: boolean
        }
        Relationships: []
      }
      gdpr_requests: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          id: string
          metadata: Json
          mosque_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string
          status:
            | "pending"
            | "processing"
            | "sent"
            | "completed"
            | "rejected"
            | "failed"
          type: "export" | "deletion"
          updated_at: string
          updated_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          metadata?: Json
          mosque_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?:
            | "pending"
            | "processing"
            | "sent"
            | "completed"
            | "rejected"
            | "failed"
          type: "export" | "deletion"
          updated_at?: string
          updated_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          metadata?: Json
          mosque_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          status?:
            | "pending"
            | "processing"
            | "sent"
            | "completed"
            | "rejected"
            | "failed"
          type?: "export" | "deletion"
          updated_at?: string
          updated_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gdpr_requests_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      group_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          is_hifz: boolean
          mosque_id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_hifz?: boolean
          mosque_id: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_hifz?: boolean
          mosque_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_categories_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      group_enrollments: {
        Row: {
          created_at: string
          created_by: string | null
          ended_at: string | null
          enrolled_at: string
          group_id: string
          id: string
          is_active: boolean
          mosque_id: string
          student_profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          enrolled_at?: string
          group_id: string
          id?: string
          is_active?: boolean
          mosque_id: string
          student_profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          enrolled_at?: string
          group_id?: string
          id?: string
          is_active?: boolean
          mosque_id?: string
          student_profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_enrollments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_enrollments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_enrollments_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_enrollments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          mosque_id: string
          name: string
          room: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          mosque_id: string
          name: string
          room?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          mosque_id?: string
          name?: string
          room?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "group_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      hifz_progress: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          mosque_id: string
          notes: string | null
          pages_memorized: number
          student_profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          mosque_id: string
          notes?: string | null
          pages_memorized?: number
          student_profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          mosque_id?: string
          notes?: string | null
          pages_memorized?: number
          student_profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hifz_progress_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hifz_progress_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hifz_progress_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hifz_progress_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_assignments: {
        Row: {
          audience: "group" | "individual"
          body: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          group_id: string
          id: string
          is_published: boolean
          lesson_id: string | null
          mosque_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          audience?: "group" | "individual"
          body?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          group_id: string
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          mosque_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          audience?: "group" | "individual"
          body?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          group_id?: string
          id?: string
          is_published?: boolean
          lesson_id?: string | null
          mosque_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_assignments_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          acknowledged_at: string
          acknowledged_by: string | null
          created_at: string
          created_by: string | null
          homework_id: string
          id: string
          mosque_id: string
          student_profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          homework_id: string
          id?: string
          mosque_id: string
          student_profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          acknowledged_at?: string
          acknowledged_by?: string | null
          created_at?: string
          created_by?: string | null
          homework_id?: string
          id?: string
          mosque_id?: string
          student_profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_targets: {
        Row: {
          created_at: string
          created_by: string | null
          homework_id: string
          id: string
          mosque_id: string
          student_profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          homework_id: string
          id?: string
          mosque_id: string
          student_profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          homework_id?: string
          id?: string
          mosque_id?: string
          student_profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_targets_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_targets_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_targets_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_audio: {
        Row: {
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          id: string
          lesson_id: string
          locale: string | null
          mime_type: string | null
          mosque_id: string
          size_bytes: number | null
          sort_order: number
          storage_path: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          lesson_id: string
          locale?: string | null
          mime_type?: string | null
          mosque_id: string
          size_bytes?: number | null
          sort_order?: number
          storage_path: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          lesson_id?: string
          locale?: string | null
          mime_type?: string | null
          mosque_id?: string
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_audio_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_audio_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string
          mosque_id: string
          student_profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id: string
          mosque_id: string
          student_profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string
          mosque_id?: string
          student_profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string
          mime_type: string | null
          mosque_id: string
          size_bytes: number | null
          sort_order: number
          storage_path: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id: string
          mime_type?: string | null
          mosque_id: string
          size_bytes?: number | null
          sort_order?: number
          storage_path: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string
          mime_type?: string | null
          mosque_id?: string
          size_bytes?: number | null
          sort_order?: number
          storage_path?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_resources_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_translations: {
        Row: {
          body: Json | null
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string
          locale: string
          mosque_id: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id: string
          locale: string
          mosque_id: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string
          locale?: string
          mosque_id?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_translations_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_translations_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          body: Json | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          mosque_id: string
          sort_order: number
          title: string
          topic_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          mosque_id: string
          sort_order?: number
          title: string
          topic_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          mosque_id?: string
          sort_order?: number
          title?: string
          topic_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      login_audit: {
        Row: {
          created_at: string
          email: string | null
          id: string
          ip_address: unknown
          mosque_id: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          mosque_id?: string | null
          success: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          mosque_id?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_audit_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          mosque_id: string
          role:
            | "platform_owner"
            | "mosque_admin"
            | "teacher"
            | "assistant"
            | "examiner"
            | "parent"
            | "student"
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mosque_id: string
          role:
            | "platform_owner"
            | "mosque_admin"
            | "teacher"
            | "assistant"
            | "examiner"
            | "parent"
            | "student"
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mosque_id?: string
          role?:
            | "platform_owner"
            | "mosque_admin"
            | "teacher"
            | "assistant"
            | "examiner"
            | "parent"
            | "student"
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      message_participants: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_read_at: string | null
          mosque_id: string
          profile_id: string | null
          thread_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_read_at?: string | null
          mosque_id: string
          profile_id?: string | null
          thread_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_read_at?: string | null
          mosque_id?: string
          profile_id?: string | null
          thread_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_participants_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          mosque_id: string
          subject: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          mosque_id: string
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          mosque_id?: string
          subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_profile_id: string | null
          body: string
          created_at: string
          created_by: string | null
          id: string
          mosque_id: string
          thread_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_profile_id?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          mosque_id: string
          thread_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_profile_id?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          mosque_id?: string
          thread_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_branding: {
        Row: {
          app_name: string | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_website: string | null
          created_at: string
          logo_url: string | null
          logo_width: number | null
          mosque_id: string
          primary_color: string | null
          secondary_color: string | null
          show_text_logo: boolean | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          app_name?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          created_at?: string
          logo_url?: string | null
          logo_width?: number | null
          mosque_id: string
          primary_color?: string | null
          secondary_color?: string | null
          show_text_logo?: boolean | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          app_name?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          created_at?: string
          logo_url?: string | null
          logo_width?: number | null
          mosque_id?: string
          primary_color?: string | null
          secondary_color?: string | null
          show_text_logo?: boolean | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mosque_branding_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: true
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_plugins: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          config: Json
          is_active: boolean
          mosque_id: string
          plugin_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          config?: Json
          is_active?: boolean
          mosque_id: string
          plugin_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          config?: Json
          is_active?: boolean
          mosque_id?: string
          plugin_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_plugins_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mosque_plugins_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugin_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      mosque_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          cancels_at: string | null
          created_at: string
          current_period_end: string | null
          id: string
          mosque_id: string
          pending_plan_id: string | null
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          cancels_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          mosque_id: string
          pending_plan_id?: string | null
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          cancels_at?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          mosque_id?: string
          pending_plan_id?: string | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mosque_subscriptions_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: true
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mosque_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      mosques: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          latitude: number | null
          locale: string
          longitude: number | null
          name: string
          prayer_location: string | null
          prayer_method: string
          school_year_start: string | null
          slug: string
          state: string
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          locale?: string
          longitude?: number | null
          name: string
          prayer_location?: string | null
          prayer_method?: string
          school_year_start?: string | null
          slug: string
          state?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          locale?: string
          longitude?: number | null
          name?: string
          prayer_location?: string | null
          prayer_method?: string
          school_year_start?: string | null
          slug?: string
          state?: string
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          mosque_id: string
          profile_id: string
          type:
            | "message"
            | "announcement"
            | "homework"
            | "attendance_absent"
            | "lesson_cancelled"
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          mosque_id: string
          profile_id: string
          type:
            | "message"
            | "announcement"
            | "homework"
            | "attendance_absent"
            | "lesson_cancelled"
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          mosque_id?: string
          profile_id?: string
          type?:
            | "message"
            | "announcement"
            | "homework"
            | "attendance_absent"
            | "lesson_cancelled"
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          body: string
          channel: "email" | "push" | "sms"
          created_at: string
          email_sent_at: string | null
          error: string | null
          id: string
          is_read: boolean
          mosque_id: string
          pushed_at: string | null
          recipient_profile_id: string
          scheduled_for: string
          sent_at: string | null
          source_announcement_id: string | null
          source_message_id: string | null
          status: "pending" | "sent" | "failed"
          subject: string | null
          template_key: string | null
          template_params: Json | null
          updated_at: string
        }
        Insert: {
          body: string
          channel?: "email" | "push" | "sms"
          created_at?: string
          email_sent_at?: string | null
          error?: string | null
          id?: string
          is_read?: boolean
          mosque_id: string
          pushed_at?: string | null
          recipient_profile_id: string
          scheduled_for?: string
          sent_at?: string | null
          source_announcement_id?: string | null
          source_message_id?: string | null
          status?: "pending" | "sent" | "failed"
          subject?: string | null
          template_key?: string | null
          template_params?: Json | null
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: "email" | "push" | "sms"
          created_at?: string
          email_sent_at?: string | null
          error?: string | null
          id?: string
          is_read?: boolean
          mosque_id?: string
          pushed_at?: string | null
          recipient_profile_id?: string
          scheduled_for?: string
          sent_at?: string | null
          source_announcement_id?: string | null
          source_message_id?: string | null
          status?: "pending" | "sent" | "failed"
          subject?: string | null
          template_key?: string | null
          template_params?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_source_announcement_id_fkey"
            columns: ["source_announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_issues: {
        Row: {
          activated_at: string | null
          created_at: string
          expires_at: string
          id: string
          issued_by: string | null
          metadata: Json
          mosque_id: string
          revoked_at: string | null
          status: "pending" | "activated" | "expired" | "revoked"
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          issued_by?: string | null
          metadata?: Json
          mosque_id: string
          revoked_at?: string | null
          status?: "pending" | "activated" | "expired" | "revoked"
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          issued_by?: string | null
          metadata?: Json
          mosque_id?: string
          revoked_at?: string | null
          status?: "pending" | "activated" | "expired" | "revoked"
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "otp_issues_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          mosque_id: string
          profile_id: string
          relation: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mosque_id: string
          profile_id: string
          relation?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mosque_id?: string
          profile_id?: string
          relation?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_profiles_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_primary: boolean
          mosque_id: string
          parent_profile_id: string
          student_profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          mosque_id: string
          parent_profile_id: string
          student_profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_primary?: boolean
          mosque_id?: string
          parent_profile_id?: string
          student_profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_parent_profile_id_fkey"
            columns: ["parent_profile_id"]
            isOneToOne: false
            referencedRelation: "parent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_audit: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event: string
          id: string
          metadata: Json
          mosque_id: string | null
          user_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event: string
          id?: string
          metadata?: Json
          mosque_id?: string | null
          user_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event?: string
          id?: string
          metadata?: Json
          mosque_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_audit_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          description: string
          features: Json
          id: string
          is_active: boolean
          max_mosques: number | null
          max_students: number | null
          name: string
          price_monthly_eur: number
          sort_order: number
        }
        Insert: {
          description: string
          features?: Json
          id: string
          is_active?: boolean
          max_mosques?: number | null
          max_students?: number | null
          name: string
          price_monthly_eur?: number
          sort_order?: number
        }
        Update: {
          description?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_mosques?: number | null
          max_students?: number | null
          name?: string
          price_monthly_eur?: number
          sort_order?: number
        }
        Relationships: []
      }
      plugin_registry: {
        Row: {
          category: string
          config_schema: Json | null
          description: string
          id: string
          is_enabled: boolean
          name: string
          sort_order: number
        }
        Insert: {
          category: string
          config_schema?: Json | null
          description: string
          id: string
          is_enabled?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          category?: string
          config_schema?: Json | null
          description?: string
          id?: string
          is_enabled?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          must_rotate_password: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          must_rotate_password?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          must_rotate_password?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      progress_notes: {
        Row: {
          author_profile_id: string | null
          body: string
          created_at: string
          created_by: string | null
          group_id: string | null
          id: string
          mosque_id: string
          student_profile_id: string
          updated_at: string
          updated_by: string | null
          visible_to_parents: boolean
        }
        Insert: {
          author_profile_id?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          mosque_id: string
          student_profile_id: string
          updated_at?: string
          updated_by?: string | null
          visible_to_parents?: boolean
        }
        Update: {
          author_profile_id?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          group_id?: string | null
          id?: string
          mosque_id?: string
          student_profile_id?: string
          updated_at?: string
          updated_by?: string | null
          visible_to_parents?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "progress_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_notes_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progress_notes_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_library_settings: {
        Row: {
          accent_color: string | null
          base_locale: string | null
          created_at: string
          created_by: string | null
          font_style: string
          intro: string | null
          is_enabled: boolean
          mosque_id: string
          show_logo: boolean
          subdomain: string | null
          theme: string
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string | null
          base_locale?: string | null
          created_at?: string
          created_by?: string | null
          font_style?: string
          intro?: string | null
          is_enabled?: boolean
          mosque_id: string
          show_logo?: boolean
          subdomain?: string | null
          theme?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string | null
          base_locale?: string | null
          created_at?: string
          created_by?: string | null
          font_style?: string
          intro?: string | null
          is_enabled?: boolean
          mosque_id?: string
          show_logo?: boolean
          subdomain?: string | null
          theme?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_library_settings_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: true
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      quran_saved_ayahs: {
        Row: {
          arabic_text: string
          ayah_number: number
          created_at: string
          id: string
          note: string | null
          surah_name: string
          surah_number: number
          translation_edition: string | null
          translation_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arabic_text: string
          ayah_number: number
          created_at?: string
          id?: string
          note?: string | null
          surah_name: string
          surah_number: number
          translation_edition?: string | null
          translation_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arabic_text?: string
          ayah_number?: number
          created_at?: string
          id?: string
          note?: string | null
          surah_name?: string
          surah_number?: number
          translation_edition?: string | null
          translation_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      report_card_sends: {
        Row: {
          id: string
          mosque_id: string
          period_start: string
          recipients: number
          sent_at: string
          student_profile_id: string
        }
        Insert: {
          id?: string
          mosque_id: string
          period_start: string
          recipients?: number
          sent_at?: string
          student_profile_id: string
        }
        Update: {
          id?: string
          mosque_id?: string
          period_start?: string
          recipients?: number
          sent_at?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_card_sends_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_card_sends_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_holidays: {
        Row: {
          created_at: string
          end_date: string
          id: string
          name: string
          start_date: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name: string
          start_date: string
          state?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          start_date?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          event_id: string
          processed_at: string
        }
        Insert: {
          event_id: string
          processed_at?: string
        }
        Update: {
          event_id?: string
          processed_at?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          full_name: string
          id: string
          is_active: boolean
          mosque_id: string
          notes: string | null
          profile_id: string | null
          updated_at: string
          updated_by: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          mosque_id: string
          notes?: string | null
          profile_id?: string | null
          updated_at?: string
          updated_by?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          mosque_id?: string
          notes?: string | null
          profile_id?: string | null
          updated_at?: string
          updated_by?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_group_links: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          is_active: boolean
          mosque_id: string
          teacher_profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          mosque_id: string
          teacher_profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          mosque_id?: string
          teacher_profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_group_links_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_group_links_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_group_links_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_group_links_teacher_profile_id_fkey"
            columns: ["teacher_profile_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          bio: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          mosque_id: string
          profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mosque_id: string
          profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mosque_id?: string
          profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_weekly_notes: {
        Row: {
          author_profile_id: string | null
          body: string
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          is_published: boolean
          mosque_id: string
          updated_at: string
          updated_by: string | null
          week_start: string
        }
        Insert: {
          author_profile_id?: string | null
          body: string
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          is_published?: boolean
          mosque_id: string
          updated_at?: string
          updated_by?: string | null
          week_start: string
        }
        Update: {
          author_profile_id?: string | null
          body?: string
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          is_published?: boolean
          mosque_id?: string
          updated_at?: string
          updated_by?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_weekly_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_weekly_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_weekly_notes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_weekly_notes_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_schedules: {
        Row: {
          category_id: string | null
          created_at: string
          day_of_week: number
          end_time: string
          group_id: string | null
          id: string
          mosque_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          day_of_week: number
          end_time?: string
          group_id?: string | null
          id?: string
          mosque_id: string
          start_time?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          group_id?: string | null
          id?: string
          mosque_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_schedules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "group_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_schedules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_schedules_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_sessions: {
        Row: {
          category_id: string | null
          created_at: string
          date: string
          end_time: string
          group_id: string | null
          id: string
          is_cancelled: boolean
          mosque_id: string
          notes: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          date: string
          end_time?: string
          group_id?: string | null
          id?: string
          is_cancelled?: boolean
          mosque_id: string
          notes?: string | null
          start_time?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          group_id?: string | null
          id?: string
          is_cancelled?: boolean
          mosque_id?: string
          notes?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "group_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "group_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_sessions_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_translations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          locale: string
          mosque_id: string
          title: string
          topic_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          locale: string
          mosque_id: string
          title: string
          topic_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          locale?: string
          mosque_id?: string
          title?: string
          topic_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_translations_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_translations_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_published: boolean
          mosque_id: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          mosque_id: string
          sort_order?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          mosque_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      written_test_answers: {
        Row: {
          answer_text: string | null
          created_at: string
          examiner_comment: string | null
          id: string
          mosque_id: string
          question_id: string
          question_order: number
          updated_at: string
          written_test_id: string
        }
        Insert: {
          answer_text?: string | null
          created_at?: string
          examiner_comment?: string | null
          id?: string
          mosque_id: string
          question_id: string
          question_order: number
          updated_at?: string
          written_test_id: string
        }
        Update: {
          answer_text?: string | null
          created_at?: string
          examiner_comment?: string | null
          id?: string
          mosque_id?: string
          question_id?: string
          question_order?: number
          updated_at?: string
          written_test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "written_test_answers_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_test_answers_written_test_id_fkey"
            columns: ["written_test_id"]
            isOneToOne: false
            referencedRelation: "written_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      written_tests: {
        Row: {
          created_at: string
          created_by: string | null
          exam_session_id: string | null
          examiner_note: string | null
          examiner_profile_id: string
          graded_at: string | null
          id: string
          mosque_id: string
          overall_result: string | null
          question_ids: string[]
          status: string
          student_profile_id: string
          submitted_at: string | null
          title: string
          token: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exam_session_id?: string | null
          examiner_note?: string | null
          examiner_profile_id: string
          graded_at?: string | null
          id?: string
          mosque_id: string
          overall_result?: string | null
          question_ids: string[]
          status?: string
          student_profile_id: string
          submitted_at?: string | null
          title: string
          token?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exam_session_id?: string | null
          examiner_note?: string | null
          examiner_profile_id?: string
          graded_at?: string | null
          id?: string
          mosque_id?: string
          overall_result?: string | null
          question_ids?: string[]
          status?: string
          student_profile_id?: string
          submitted_at?: string | null
          title?: string
          token?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "written_tests_exam_session_id_fkey"
            columns: ["exam_session_id"]
            isOneToOne: false
            referencedRelation: "exam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_tests_examiner_profile_id_fkey"
            columns: ["examiner_profile_id"]
            isOneToOne: false
            referencedRelation: "teacher_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_tests_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "written_tests_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      group_directory: {
        Row: {
          category_id: string | null
          id: string | null
          mosque_id: string | null
          name: string | null
          room: string | null
        }
        Insert: {
          category_id?: string | null
          id?: string | null
          mosque_id?: string | null
          name?: string | null
          room?: string | null
        }
        Update: {
          category_id?: string | null
          id?: string | null
          mosque_id?: string | null
          name?: string | null
          room?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "group_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_exam_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      messaging_contacts: {
        Args: { p_mosque_id: string }
        Returns: {
          name: string
          profile_id: string
          role: string
        }[]
      }
      purge_user_pii: {
        Args: { target_email: string; target_user_id: string }
        Returns: undefined
      }
      resolve_library_subdomain: {
        Args: { p_subdomain: string }
        Returns: string
      }
      respond_to_exam_schedule: {
        Args: {
          p_action: string
          p_counter_date?: string
          p_session_id: string
        }
        Returns: undefined
      }
      thread_participant_names: {
        Args: { p_thread_ids: string[] }
        Returns: {
          name: string
          profile_id: string
          thread_id: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

