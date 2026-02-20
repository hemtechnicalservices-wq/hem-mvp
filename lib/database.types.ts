// lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          created_at: string | null;

          status: "new" | "scheduled" | "in_progress" | "done" | null;
          service: string | null;
          notes: string | null;

          assigned_to: string | null;
          customer_id: string | null;
          created_by: string | null;
          technician_id: string | null;

          started_at: string | null;
          completed_at: string | null;

          completed_notes: string | null;
          completion_photos: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string | null;

          status?: "new" | "scheduled" | "in_progress" | "done" | null;
          service?: string | null;
          notes?: string | null;

          assigned_to?: string | null;
          customer_id?: string | null;
          created_by?: string | null;
          technician_id?: string | null;

          started_at?: string | null;
          completed_at?: string | null;

          completed_notes?: string | null;
          completion_photos?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string | null;

          status?: "new" | "scheduled" | "in_progress" | "done" | null;
          service?: string | null;
          notes?: string | null;

          assigned_to?: string | null;
          customer_id?: string | null;
          created_by?: string | null;
          technician_id?: string | null;

          started_at?: string | null;
          completed_at?: string | null;

          completed_notes?: string | null;
          completion_photos?: string[] | null;
        };
        Relationships: [];
      };

      // Keep minimal placeholders so TS is happy if you reference these later.
      profiles: {
        Row: { id: string };
        Insert: { id: string };
        Update: { id?: string };
        Relationships: [];
      };

      technicians: {
        Row: {
          is_active: boolean;
          role: any;
          full_name: string;
          id: string;
          user_id: string | null;
};
        Insert: { id: string; user_id?: string | null };
        Update: { id?: string; user_id?: string | null };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}