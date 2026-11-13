export type AppRole = 'student' | 'parent' | 'teacher' | 'admin';
export type SchoolCategory = 'primary' | 'middle' | 'secondary';

type Table<Row, Insert = Row, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        {
          user_id: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          user_id: string;
          first_name?: string;
          last_name?: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          first_name?: string;
          last_name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        }
      >;
      user_roles: Table<
        { user_id: string; role: AppRole; created_at: string },
        never,
        never
      >;
      education_systems: Table<
        {
          id: string;
          name: string;
          country_code: string;
          locale: string;
          is_active: boolean;
          created_at: string;
        },
        {
          id?: string;
          name: string;
          country_code: string;
          locale?: string;
          is_active?: boolean;
          created_at?: string;
        }
      >;
      school_levels: Table<
        {
          id: string;
          education_system_id: string;
          name: string;
          category: SchoolCategory;
          sort_order: number;
          is_active: boolean;
        },
        {
          id?: string;
          education_system_id: string;
          name: string;
          category: SchoolCategory;
          sort_order: number;
          is_active?: boolean;
        }
      >;
      school_classes: Table<
        {
          id: string;
          school_level_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
        },
        {
          id?: string;
          school_level_id: string;
          name: string;
          sort_order: number;
          is_active?: boolean;
        }
      >;
      school_series: Table<
        {
          id: string;
          education_system_id: string;
          code: string;
          name: string;
          is_active: boolean;
        },
        {
          id?: string;
          education_system_id: string;
          code: string;
          name: string;
          is_active?: boolean;
        }
      >;
      student_profiles: Table<
        {
          user_id: string;
          education_system_id: string;
          school_level_id: string;
          class_id: string;
          series_id: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          user_id: string;
          education_system_id: string;
          school_level_id: string;
          class_id: string;
          series_id?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          education_system_id?: string;
          school_level_id?: string;
          class_id?: string;
          series_id?: string | null;
          updated_at?: string;
        }
      >;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      app_role: AppRole;
      school_category: SchoolCategory;
    };
    CompositeTypes: Record<never, never>;
  };
}
