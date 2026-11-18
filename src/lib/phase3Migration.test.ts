import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20261116060000_phase3_pedagogical_system.sql', 'utf8');

describe('contrats statiques de la migration Phase 3 (tests locaux, sans Supabase)', () => {
  it('active RLS sur chaque table créée et ne contient aucune suppression/desactivation destructive', () => {
    const tables = [...migration.matchAll(/create\s+table\s+public\.([a-z_]+)/gi)].map((match) => match[1]);
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) expect(migration).toMatch(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
    expect(migration).not.toMatch(/\bdrop\s+table\b/i);
    expect(migration).not.toMatch(/\btruncate(?:\s+table)?\b/i);
    expect(migration.match(/delete\s+from\s+public\.(student_favorites|student_learning_progress)[^;]*;/gi) ?? []).toHaveLength(1);
    expect(migration).toMatch(/delete\s+from\s+public\.student_favorites\s+where\s+owner_user_id=auth\.uid\(\)/i);
    expect(migration).not.toMatch(/delete\s+from\s+public\.student_learning_progress/i);
    expect(migration).not.toMatch(/disable\s+row\s+level\s+security/i);
  });

  it('couvre les référentiels, active RLS sur toutes les tables Phase3 et conserve les seeds non destructifs', () => {
    const tables = ['education_countries', 'school_class_series', 'school_subjects', 'school_class_subjects', 'school_chapters', 'learning_courses', 'learning_lessons', 'learning_resources', 'learning_videos', 'student_favorites', 'student_learning_progress'];
    for (const table of tables) {
      expect(migration).toMatch(new RegExp(`create\\s+table\\s+public\\.${table}`, 'i'));
      expect(migration).toMatch(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
    }
    expect(migration).toMatch(/exercises jsonb not null default '\[\]'/i);
    expect(migration).toMatch(/insert into public\.learning_lessons\([^;]*illustrations,exercises,summary/i);
    expect(migration).toMatch(/drop constraint if exists education_systems_country_code_key/i);
    expect(migration).toMatch(/education_systems_country_code_fk/i);
    expect(migration).toMatch(/on\s+conflict\s*\(code\)\s+do\s+nothing/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.school_subjects/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.school_classes/i);
  });

  it('autorise la gestion CMS uniquement aux admins, avec audit insert/update/delete', () => {
    for (const [, policy] of [
      ['education_countries', 'countries_admin_manage'], ['school_class_series', 'class_series_admin_manage'],
      ['school_subjects', 'subjects_admin_manage'], ['school_class_subjects', 'class_subjects_admin_manage'],
      ['school_chapters', 'chapters_admin_manage'], ['learning_courses', 'courses_admin_manage'],
      ['learning_lessons', 'lessons_admin_manage'], ['learning_resources', 'resources_admin_manage'], ['learning_videos', 'videos_admin_manage'],
    ]) {
      expect(migration).toMatch(new RegExp(`create\\s+policy\\s+${policy}[\\s\\S]*?for\\s+all[\\s\\S]*?phase3_user_has_role\\('admin'::public\\.app_role\\)`, 'i'));
    }
    expect(migration).toMatch(/grant\s+insert,update\s+on\s+public\.education_countries[\s\S]*?to\s+authenticated/i);
    expect(migration).not.toMatch(/grant\s+[^;]*delete\s+on\s+public\.(?:education_countries|school_subjects|school_chapters|learning_courses|learning_lessons|learning_resources|learning_videos)\b/i);
    expect(migration).toMatch(/phase3_audit_admin_content[\s\S]*?admin_audit_logs/i);
    expect(migration).toMatch(/phase3_admin_publish[\s\S]*?admin_audit_logs/i);
  });

  it('valide resource uploads de contribution (path, MIME, taille, extension) et publie uniquement après éligibilité', () => {
    expect(migration).toMatch(/s\.content_type='resource'[\s\S]*?eduflow-teacher-contributions/i);
    expect(migration).toMatch(/fpath\s+is\s+distinct\s+from\s+s\.teacher_user_id::text/i);
    expect(migration).toMatch(/s\.id::text\s*\|\|\s*'\/'\s*\|\|\s*fname/i);
    expect(migration).toMatch(/fsize<1\s+or\s+fsize>52428800/i);
    expect(migration).toMatch(/invalid_resource_extension/i);
    expect(migration).toMatch(/\\\.\(pdf\|docx\|jpg\|jpeg\|png\|webp\|mp3\|m4a\|mp4\|txt\)/i);
    expect(migration).toMatch(/storage_bucket\s+in\s*\('eduflow-learning-resources','eduflow-teacher-contributions'\)/i);
    expect(migration).toMatch(/phase3_learning_resource_contribution_read[\s\S]*?r\.status='published'[\s\S]*?phase3_student_matches[\s\S]*?r\.class_id/i);
  });

  it('préserve les buckets existants privés, sans suppression d’objet ni accès public', () => {
    expect(migration).toMatch(/values\s*\('eduflow-learning-resources',[^;]*?false,/i);
    expect(migration).toMatch(/on\s+conflict\s*\(id\)\s+do\s+nothing/i);
    expect(migration).toMatch(/phase3_library_admin_read[\s\S]*?bucket_id='eduflow-learning-resources'[\s\S]*?phase3_user_has_role\('admin'/i);
    expect(migration).toMatch(/phase3_library_admin_insert[\s\S]*?bucket_id='eduflow-learning-resources'[\s\S]*?phase3_user_has_role\('admin'/i);
    expect(migration).not.toMatch(/create\s+policy[^;]*(?:for\s+(?:update|delete)|public\s+true)/i);
    expect(migration).not.toMatch(/update\s+storage\.buckets|set\s+public\s*=\s*true/i);
  });

  it('conserve la revue legacy et ajoute la promotion de resource transactionnelle/auditée', () => {
    expect(migration).toMatch(/alter\s+type\s+public\.content_submission_type\s+add\s+value\s+if\s+not\s+exists\s+'lesson'/i);
    expect(migration).toMatch(/alter\s+type\s+public\.content_submission_type\s+add\s+value\s+if\s+not\s+exists\s+'video'/i);
    expect(migration).toMatch(/phase3_review_submission[\s\S]*?phase2_require_role\('admin'::public\.app_role\)[\s\S]*?p_next_status\s+in\s*\('approved',\s*'rejected'\)[\s\S]*?s\.content_type='resource'[\s\S]*?admin_audit_logs/i);
  });

  it('scelle les favoris et progressions aux étudiants propriétaires et contenu admissible', () => {
    expect(migration).toMatch(/student_favorites_exactly_one_target[\s\S]*?lesson_id\s+is\s+not\s+null\s+and\s+video_id\s+is\s+null/i);
    expect(migration).toMatch(/grant\s+select\s+on\s+public\.student_favorites,public\.student_learning_progress\s+to\s+authenticated/i);
    expect(migration).not.toMatch(/grant\s+[^;]*(?:insert|update|delete)[^;]*on\s+public\.student_favorites,public\.student_learning_progress/i);
    expect(migration).toMatch(/favorites_owner_student[\s\S]*?owner_user_id\s*=\s*auth\.uid\(\)[\s\S]*?phase3_user_has_role\('student'::public\.app_role\)/i);
    expect(migration).toMatch(/progress_owner_student[\s\S]*?owner_user_id\s*=\s*auth\.uid\(\)[\s\S]*?phase3_user_has_role\('student'::public\.app_role\)/i);
    expect(migration).toMatch(/progress_parent_read[\s\S]*?phase2_parent_can_read_student\(owner_user_id\)/i);
    for (const fn of ['phase3_toggle_favorite', 'phase3_update_progress']) {
      expect(migration).toMatch(new RegExp(`${fn}[\\s\\S]*?phase2_require_role\\('student'::public\\.app_role\\)[\\s\\S]*?content_not_eligible`, 'i'));
      expect(migration).toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.[^;]*${fn}`, 'i'));
    }
    expect(migration).toMatch(/p_position_seconds<0[\s\S]*?char_length\(coalesce\(p_last_section,''\)\)>200/i);
  });

  it('vérifie série et cohérence système/classe/matière/chapter/lesson', () => {
    expect(migration).toMatch(/add\s+column\s+series_id\s+uuid[\s\S]*?learning_courses/i);
    expect(migration).toMatch(/phase3_student_matches[\s\S]*?sp\.education_system_id=p_system[\s\S]*?sp\.class_id=p_class[\s\S]*?school_class_series/i);
    expect(migration).toMatch(/p_series\s+is\s+null\s+or\s+sp\.series_id=p_series/i);
    expect(migration).toMatch(/insert into public\.learning_courses[\s\S]*?nullif\(payload->>'series_id',''\)::uuid/i);
    expect(migration).toMatch(/phase3_validate_content_scope[\s\S]*?content_scope_mismatch[\s\S]*?chapter_scope_mismatch[\s\S]*?lesson_scope_mismatch/i);
  });

  it('garantit les invariants de portée, archivage, audit et privilèges minimaux', () => {
    for (const table of ['education_systems', 'school_levels', 'school_classes', 'school_series']) {
      expect(migration).toMatch(new RegExp(String.raw`grant\s+insert,update\s+on\s+public\.education_systems[\s\S]*?public\.school_series\s+to\s+authenticated`, 'i'));
      expect(migration).toMatch(new RegExp(String.raw`public\.${table}`, 'i'));
      expect(migration).toMatch(new RegExp(String.raw`create\s+policy\s+phase3_${table}_admin_manage[\s\S]*?for\s+all[\s\S]*?phase3_user_has_role\('admin'::public\.app_role\)`, 'i'));
    }
    expect(migration).toMatch(/drop policy if exists courses_student_published[\s\S]*?create policy courses_student_published[\s\S]*?phase3_student_matches\(education_system_id,class_id,series_id\)/i);
    expect(migration).toMatch(/drop policy if exists phase3_learning_resource_read on storage\.objects/i);
    expect(migration).toMatch(/resource_type text not null check\(resource_type in \('pdf','document','image','illustration','revision_sheet','audio','other'\)\)/i);
    expect(migration).not.toMatch(/learning_resources_type_check/i);
    expect(migration).toMatch(/completed_at=coalesce\(public\.student_learning_progress\.completed_at,excluded\.completed_at\)/i);
    expect(migration).toMatch(/phase3_validate_class_subject[\s\S]*?class_subject_system_mismatch/i);
    expect(migration).toMatch(/phase3_validate_class_series[\s\S]*?class_series_system_mismatch/i);
    expect(migration).toMatch(/provider text not null check\(provider in \('youtube','vimeo'\)\)/i);
    expect(migration).toMatch(/drop constraint if exists education_systems_country_code_key/i);
    expect(migration).not.toMatch(/drop\s+table|truncate\b/i);
    expect(migration).not.toMatch(/grant\s+[^;]*delete\s+on\s+public\.(?:education_countries|school_subjects|school_chapters|learning_courses|learning_lessons|learning_resources|learning_videos|education_systems|school_levels|school_classes|school_series)\b/i);
    expect(migration).not.toMatch(/create\s+policy[^;]*for\s+delete/i);
    expect(migration).toMatch(/application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/i);
    expect(migration).toMatch(/create trigger phase3_class_subject_system/i);
    expect(migration).toMatch(/create trigger phase3_class_series_system/i);
    expect(migration).toMatch(/education_systems_country_code_fk/i);
  });

});
