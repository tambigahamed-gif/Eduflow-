export type AppRole = 'student' | 'parent' | 'teacher' | 'admin';
export type RequestedRole = Extract<AppRole, 'parent' | 'teacher'>;
export type SchoolCategory = 'primary' | 'middle' | 'secondary';
export type RoleApplicationStatus = 'pending' | 'approved' | 'rejected';
export type ParentLinkRequestStatus = 'pending' | 'accepted' | 'rejected' | 'revoked';
export type ParentLinkStatus = 'active' | 'revoked';
export type LearningGoalStatus = 'active' | 'paused' | 'achieved';
export type LearningActivityType = 'chapter_completed' | 'exercise_result' | 'exam_result' | 'difficulty';
export type ContentType = 'course' | 'resource' | 'exercise' | 'lesson' | 'video';
export type ContentStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';
export type ContentReviewStatus = Extract<ContentStatus, 'in_review' | 'approved' | 'rejected'>;
export type LearningContentStatus = 'draft' | 'approved' | 'published' | 'archived';
export type LearningResourceType = 'pdf' | 'document' | 'image' | 'illustration' | 'revision_sheet' | 'audio' | 'other';
export type VideoProvider = 'youtube' | 'vimeo';
export type NotificationKind = 'parent_link' | 'role_application' | 'contribution' | 'admin_notice';
export type ReportFrequency = 'none' | 'weekly' | 'monthly';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AdminUser = {
  user_id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  roles: AppRole[];
  created_at: string;
};

export type AdminSummary = {
  students: number;
  parents: number;
  teachers: number;
  pending_role_applications: number;
  pending_contributions: number;
  unread_notifications: number;
};

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
      user_roles: Table<{ user_id: string; role: AppRole; created_at: string }, never, never>;
      education_systems: Table<
        { id: string; name: string; country_code: string; locale: string; is_active: boolean; created_at: string },
        { id?: string; name: string; country_code: string; locale?: string; is_active?: boolean; created_at?: string }
      >;
      school_levels: Table<
        { id: string; education_system_id: string; name: string; category: SchoolCategory; sort_order: number; is_active: boolean },
        { id?: string; education_system_id: string; name: string; category: SchoolCategory; sort_order: number; is_active?: boolean }
      >;
      school_classes: Table<
        { id: string; school_level_id: string; name: string; sort_order: number; is_active: boolean },
        { id?: string; school_level_id: string; name: string; sort_order: number; is_active?: boolean }
      >;
      school_series: Table<
        { id: string; education_system_id: string; code: string; name: string; is_active: boolean },
        { id?: string; education_system_id: string; code: string; name: string; is_active?: boolean }
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
        { education_system_id?: string; school_level_id?: string; class_id?: string; series_id?: string | null; updated_at?: string }
      >;
      role_applications: Table<
        {
          id: string;
          user_id: string;
          requested_role: RequestedRole;
          presentation: string | null;
          subjects: string[];
          levels: string[];
          status: RoleApplicationStatus;
          review_note: string | null;
          reviewer_id: string | null;
          created_at: string;
          reviewed_at: string | null;
          updated_at: string;
        },
        never,
        never
      >;
      parent_profiles: Table<{ user_id: string; created_at: string }, never, never>;
      teacher_profiles: Table<
        {
          user_id: string;
          presentation: string;
          subjects: string[];
          levels: string[];
          is_active: boolean;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        },
        never,
        { presentation?: string; subjects?: string[]; levels?: string[]; updated_at?: string }
      >;
      parent_invite_codes: Table<
        { id: string; student_user_id: string; code_hash: string; expires_at: string; consumed_at: string | null; revoked_at: string | null; created_at: string },
        never,
        never
      >;
      parent_link_requests: Table<
        {
          id: string;
          parent_user_id: string;
          student_user_id: string;
          status: ParentLinkRequestStatus;
          created_at: string;
          decided_at: string | null;
        },
        never,
        never
      >;
      parent_student_links: Table<
        {
          id: string;
          parent_user_id: string;
          student_user_id: string;
          request_id: string;
          status: ParentLinkStatus;
          created_at: string;
          revoked_at: string | null;
        },
        never,
        never
      >;
      learning_goals: Table<
        {
          id: string;
          student_user_id: string;
          created_by: string;
          title: string;
          description: string;
          target_date: string | null;
          status: LearningGoalStatus;
          created_at: string;
          updated_at: string;
        },
        never,
        never
      >;
      learning_activity: Table<
        {
          id: string;
          student_user_id: string;
          activity_type: LearningActivityType;
          source_id: string | null;
          title: string;
          subject: string | null;
          score: number | null;
          score_max: number | null;
          occurred_at: string;
          details: Json;
        },
        never,
        never
      >;
      content_submissions: Table<
        {
          id: string;
          teacher_user_id: string;
          content_type: ContentType;
          title: string;
          description: string;
          subjects: string[];
          levels: string[];
          status: ContentStatus;
          assets: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
          submitted_at: string | null;
          reviewed_at: string | null;
        },
        never,
        { title?: string; description?: string; subjects?: string[]; levels?: string[]; assets?: Json; metadata?: Json }
      >;
      content_reviews: Table<
        {
          id: string;
          submission_id: string;
          reviewer_id: string;
          status: ContentReviewStatus;
          note: string | null;
          created_at: string;
        },
        never,
        never
      >;
      notifications: Table<
        {
          id: string;
          user_id: string;
          notification_type: NotificationKind;
          title: string;
          body: string;
          read_at: string | null;
          created_by: string | null;
          created_at: string;
        },
        never,
        { read_at?: string | null }
      >;
      notification_preferences: Table<
        { user_id: string; report_frequency: ReportFrequency; in_app_enabled: boolean; updated_at: string },
        never,
        never
      >;
      admin_audit_logs: Table<
        {
          id: number;
          admin_user_id: string;
          action: string;
          target_user_id: string | null;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        },
        never,
        never
      >;
      education_countries: Table<
        { code: string; name: string; is_active: boolean; created_at: string },
        { code: string; name: string; is_active?: boolean; created_at?: string }
      >;
      school_class_series: Table<{ class_id: string; series_id: string }, { class_id: string; series_id: string }>;
      school_subjects: Table<
        { id: string; education_system_id: string; code: string; name: string; description: string; sort_order: number; is_active: boolean },
        { id?: string; education_system_id: string; code: string; name: string; description?: string; sort_order?: number; is_active?: boolean }
      >;
      school_class_subjects: Table<{ class_id: string; subject_id: string }, { class_id: string; subject_id: string }>;
      school_chapters: Table<
        { id: string; class_id: string; subject_id: string; title: string; description: string; sort_order: number; is_active: boolean },
        { id?: string; class_id: string; subject_id: string; title: string; description?: string; sort_order?: number; is_active?: boolean }
      >;
      learning_courses: Table<
        { id: string; education_system_id: string; class_id: string; subject_id: string; series_id: string | null; title: string; description: string; status: LearningContentStatus; author_user_id: string; approved_by: string | null; source_submission_id: string | null; created_at: string; updated_at: string; published_at: string | null; archived_at: string | null },
        { id?: string; education_system_id: string; class_id: string; subject_id: string; series_id?: string | null; title: string; description?: string; status?: LearningContentStatus; author_user_id: string; approved_by?: string | null; source_submission_id?: string | null; created_at?: string; updated_at?: string; published_at?: string | null; archived_at?: string | null }
      >;
      learning_lessons: Table<
        { id: string; course_id: string; chapter_id: string | null; title: string; description: string; learning_objectives: string[]; introduction: string; explanation: string; definitions: Json; examples: Json; formulas: Json; illustrations: Json; exercises: Json; summary: string; key_points: string[]; author_user_id: string; status: LearningContentStatus; approved_by: string | null; source_submission_id: string | null; created_at: string; updated_at: string; published_at: string | null; archived_at: string | null },
        { id?: string; course_id: string; chapter_id?: string | null; title: string; description?: string; learning_objectives?: string[]; introduction?: string; explanation?: string; definitions?: Json; examples?: Json; formulas?: Json; illustrations?: Json; exercises?: Json; summary?: string; key_points?: string[]; author_user_id: string; status?: LearningContentStatus; approved_by?: string | null; source_submission_id?: string | null; created_at?: string; updated_at?: string; published_at?: string | null; archived_at?: string | null }
      >;
      learning_resources: Table<
        { id: string; lesson_id: string | null; education_system_id: string; class_id: string; subject_id: string; chapter_id: string | null; series_id: string | null; title: string; description: string; resource_type: LearningResourceType; storage_bucket: string; storage_path: string; mime_type: string; file_size: number; downloadable: boolean; status: LearningContentStatus; author_user_id: string; approved_by: string | null; source_submission_id: string | null; created_at: string; updated_at: string; published_at: string | null; archived_at: string | null },
        { id?: string; lesson_id?: string | null; education_system_id: string; class_id: string; subject_id: string; chapter_id?: string | null; series_id?: string | null; title: string; description?: string; resource_type: LearningResourceType; storage_bucket?: string; storage_path: string; mime_type: string; file_size: number; downloadable?: boolean; status?: LearningContentStatus; author_user_id: string; approved_by?: string | null; source_submission_id?: string | null; created_at?: string; updated_at?: string; published_at?: string | null; archived_at?: string | null }
      >;
      learning_videos: Table<
        { id: string; lesson_id: string | null; education_system_id: string; class_id: string; subject_id: string; chapter_id: string | null; series_id: string | null; title: string; description: string; provider: VideoProvider; external_url: string; thumbnail_url: string | null; duration_seconds: number | null; status: LearningContentStatus; author_user_id: string; approved_by: string | null; source_submission_id: string | null; created_at: string; updated_at: string; published_at: string | null; archived_at: string | null },
        { id?: string; lesson_id?: string | null; education_system_id: string; class_id: string; subject_id: string; chapter_id?: string | null; series_id?: string | null; title: string; description?: string; provider: VideoProvider; external_url: string; thumbnail_url?: string | null; duration_seconds?: number | null; status?: LearningContentStatus; author_user_id: string; approved_by?: string | null; source_submission_id?: string | null; created_at?: string; updated_at?: string; published_at?: string | null; archived_at?: string | null }
      >;
      student_favorites: Table<
        { owner_user_id: string; lesson_id: string | null; video_id: string | null; created_at: string },
        { owner_user_id: string; lesson_id?: string | null; video_id?: string | null; created_at?: string },
        never
      >;
      student_learning_progress: Table<
        { owner_user_id: string; lesson_id: string | null; video_id: string | null; last_position_seconds: number; last_section: string | null; completed_at: string | null; last_viewed_at: string; updated_at: string },
        { owner_user_id: string; lesson_id?: string | null; video_id?: string | null; last_position_seconds?: number; last_section?: string | null; completed_at?: string | null; last_viewed_at?: string; updated_at?: string },
        never
      >;
    };
    Views: Record<never, never>;
    Functions: {
      phase2_user_has_role: { Args: { p_role: AppRole }; Returns: boolean };
      phase2_parent_can_read_student: { Args: { p_student_user_id: string }; Returns: boolean };
      phase2_apply_for_role: {
        Args: { p_role: RequestedRole; p_presentation?: string | null; p_subjects?: string[]; p_levels?: string[] };
        Returns: string;
      };
      phase2_review_role_application: { Args: { p_application_id: string; p_approve: boolean; p_note?: string | null }; Returns: undefined };
      phase2_generate_parent_link_code: { Args: Record<PropertyKey, never>; Returns: string };
      phase2_request_parent_link: { Args: { p_code: string }; Returns: string };
      phase2_decide_parent_link: { Args: { p_request_id: string; p_accept: boolean }; Returns: string | null };
      phase2_revoke_parent_link: { Args: { p_link_id: string }; Returns: undefined };
      phase2_create_learning_goal: {
        Args: { p_student_user_id: string; p_title: string; p_description?: string | null; p_target_date?: string | null };
        Returns: string;
      };
      phase2_update_learning_goal: {
        Args: { p_goal_id: string; p_title: string; p_description?: string | null; p_target_date?: string | null };
        Returns: undefined;
      };
      phase2_complete_learning_goal: { Args: { p_goal_id: string }; Returns: undefined };
      phase2_update_notification_preferences: { Args: { p_report_frequency: ReportFrequency; p_in_app_enabled: boolean }; Returns: undefined };
      phase2_create_content_draft: { Args: { p_content_type: ContentType; p_title: string; p_description?: string | null }; Returns: string };
      phase2_submit_content: { Args: { p_submission_id: string }; Returns: undefined };
      phase2_review_content: { Args: { p_submission_id: string; p_next_status: ContentReviewStatus; p_note?: string | null }; Returns: undefined };
      phase2_admin_summary: { Args: Record<PropertyKey, never>; Returns: AdminSummary };
      phase2_admin_list_users: {
        Args: { p_query?: string | null; p_limit?: number; p_offset?: number; p_role?: AppRole | null };
        Returns: AdminUser[];
      };
      phase2_admin_set_role: {
        Args: { p_user_id: string; p_role: RequestedRole; p_grant: boolean; p_note?: string | null };
        Returns: undefined;
      };
      phase2_admin_send_notification: { Args: { p_user_id: string; p_title: string; p_body: string }; Returns: string };
      phase2_mark_notification_read: { Args: { p_notification_id: string }; Returns: undefined };
      phase3_user_has_role: { Args: { p_role: AppRole }; Returns: boolean };
      phase3_student_matches: { Args: { p_system: string; p_class: string; p_series?: string | null }; Returns: boolean };
      phase3_lesson_readable: { Args: { p_id: string }; Returns: boolean };
      phase3_video_readable: { Args: { p_id: string }; Returns: boolean };
      phase3_review_submission: { Args: { p_submission_id: string; p_next_status: ContentReviewStatus; p_note?: string | null }; Returns: string | null };
      phase3_admin_publish: { Args: { p_kind: 'course' | 'lesson' | 'video' | 'resource'; p_id: string; p_publish: boolean }; Returns: undefined };
      phase3_toggle_favorite: { Args: { p_lesson_id: string | null; p_video_id: string | null; p_favorite: boolean }; Returns: undefined };
      phase3_update_progress: { Args: { p_lesson_id: string | null; p_video_id: string | null; p_position_seconds: number; p_last_section: string | null; p_completed: boolean }; Returns: undefined };
    };
    Enums: {
      app_role: AppRole;
      school_category: SchoolCategory;
      role_application_status: RoleApplicationStatus;
      parent_link_request_status: ParentLinkRequestStatus;
      parent_link_status: ParentLinkStatus;
      learning_goal_status: LearningGoalStatus;
      learning_activity_type: LearningActivityType;
      content_submission_type: ContentType;
      content_status: ContentStatus;
      learning_content_status: LearningContentStatus;
      notification_kind: NotificationKind;
      report_frequency: ReportFrequency;
    };
    CompositeTypes: Record<never, never>;
  };
}
