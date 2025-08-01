export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          type: 'income' | 'savings' | 'expense'
          parent_id: string | null
          level: number
          organization_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'income' | 'savings' | 'expense'
          parent_id?: string | null
          level: number
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'income' | 'savings' | 'expense'
          parent_id?: string | null
          level?: number
          organization_id?: string
          created_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          name: string
          type: 'cash' | 'card' | 'account' | 'other'
          organization_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'cash' | 'card' | 'account' | 'other'
          organization_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'cash' | 'card' | 'account' | 'other'
          organization_id?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          amount: number
          description: string
          transaction_date: string
          category_id: string
          payment_method_id: string
          organization_id: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          amount: number
          description: string
          transaction_date: string
          category_id: string
          payment_method_id: string
          organization_id: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          amount?: number
          description?: string
          transaction_date?: string
          category_id?: string
          payment_method_id?: string
          organization_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      asset_categories: {
        Row: {
          id: string
          name: string
          type:
            | 'real_estate'
            | 'financial'
            | 'investment'
            | 'retirement'
            | 'cash'
            | 'other'
          icon: string | null
          color: string | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type:
            | 'real_estate'
            | 'financial'
            | 'investment'
            | 'retirement'
            | 'cash'
            | 'other'
          icon?: string | null
          color?: string | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?:
            | 'real_estate'
            | 'financial'
            | 'investment'
            | 'retirement'
            | 'cash'
            | 'other'
          icon?: string | null
          color?: string | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          name: string
          description: string | null
          category_id: string
          current_value: number
          last_updated_value: number | null
          last_updated_date: string | null
          organization_id: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category_id: string
          current_value?: number
          last_updated_value?: number | null
          last_updated_date?: string | null
          organization_id: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category_id?: string
          current_value?: number
          last_updated_value?: number | null
          last_updated_date?: string | null
          organization_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      liabilities: {
        Row: {
          id: string
          name: string
          description: string | null
          type:
            | 'mortgage'
            | 'personal_loan'
            | 'credit_card'
            | 'student_loan'
            | 'other'
          current_amount: number
          original_amount: number | null
          interest_rate: number | null
          monthly_payment: number | null
          due_date: string | null
          organization_id: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type:
            | 'mortgage'
            | 'personal_loan'
            | 'credit_card'
            | 'student_loan'
            | 'other'
          current_amount?: number
          original_amount?: number | null
          interest_rate?: number | null
          monthly_payment?: number | null
          due_date?: string | null
          organization_id: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?:
            | 'mortgage'
            | 'personal_loan'
            | 'credit_card'
            | 'student_loan'
            | 'other'
          current_amount?: number
          original_amount?: number | null
          interest_rate?: number | null
          monthly_payment?: number | null
          due_date?: string | null
          organization_id?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      asset_value_history: {
        Row: {
          id: string
          asset_id: string
          value: number
          recorded_date: string
          note: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          asset_id: string
          value: number
          recorded_date?: string
          note?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          asset_id?: string
          value?: number
          recorded_date?: string
          note?: string | null
          created_by?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
