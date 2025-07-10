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
