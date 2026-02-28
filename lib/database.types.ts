export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          service: string | null;
          notes: string | null;
          status: string | null;

          created_at: string | null;
          started_at: string | null;
          completed_at: string | null;

          assigned_to: string | null;
          technician_id: string | null;
          created_by: string | null;

          customer_id: string | null;
          owner_user_id: string | null;

          image_url: string | null;
          completion_notes: string | null;
          completion_photos: string[] | null;

          price: number | null;
        };
        Insert: Partial<Database['public']['Tables']['jobs']['Row']>;
        Update: Partial<Database['public']['Tables']['jobs']['Row']>;
      };

      technicians: {
        Row: {
          id: string;
          full_name: string | null;
          is_active: boolean | null;
          role: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['technicians']['Row']>;
        Update: Partial<Database['public']['Tables']['technicians']['Row']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};