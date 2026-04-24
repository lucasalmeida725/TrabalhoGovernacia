export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          email: string
          full_name: string
          role: 'admin' | 'auditor' | 'client'
          company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          full_name: string
          role: 'admin' | 'auditor' | 'client'
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'auditor' | 'client'
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          cnpj: string
          sector: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          cnpj: string
          sector?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          cnpj?: string
          sector?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      pillars: {
        Row: {
          id: string
          name: string
          description: string | null
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          display_order?: number
          created_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          pillar_id: string
          question_text: string
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          pillar_id: string
          question_text: string
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          pillar_id?: string
          question_text?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      assessments: {
        Row: {
          id: string
          company_id: string
          auditor_id: string
          status: 'draft' | 'completed'
          started_at: string
          completed_at: string | null
          total_score: number | null
          classification: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          auditor_id: string
          status?: 'draft' | 'completed'
          started_at?: string
          completed_at?: string | null
          total_score?: number | null
          classification?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          auditor_id?: string
          status?: 'draft' | 'completed'
          started_at?: string
          completed_at?: string | null
          total_score?: number | null
          classification?: string | null
          created_at?: string
        }
      }
      assessment_responses: {
        Row: {
          id: string
          assessment_id: string
          question_id: string
          response_type: 'ok' | 'partial' | 'not_ok' | 'not_applicable'
          score: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          assessment_id: string
          question_id: string
          response_type: 'ok' | 'partial' | 'not_ok' | 'not_applicable'
          score?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          assessment_id?: string
          question_id?: string
          response_type?: 'ok' | 'partial' | 'not_ok' | 'not_applicable'
          score?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      evidences: {
        Row: {
          id: string
          response_id: string
          description: string
          file_url: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          response_id: string
          description: string
          file_url?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          description?: string
          file_url?: string | null
          uploaded_at?: string
        }
      }
      action_plans: {
        Row: {
          id: string
          response_id: string
          what: string
          why: string
          who: string
          where_location: string | null
          when_deadline: string | null
          how: string
          how_much: string | null
          priority: 'low' | 'medium' | 'high' | 'critical' | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          response_id: string
          what: string
          why: string
          who: string
          where_location?: string | null
          when_deadline?: string | null
          how: string
          how_much?: string | null
          priority?: 'low' | 'medium' | 'high' | 'critical' | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          what?: string
          why?: string
          who?: string
          where_location?: string | null
          when_deadline?: string | null
          how?: string
          how_much?: string | null
          priority?: 'low' | 'medium' | 'high' | 'critical' | null
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
