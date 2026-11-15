import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/20261114120000_phase2_user_spaces.sql', 'utf8');
const teacherPortal = readFileSync('src/features/teachers/TeacherPortal.tsx', 'utf8');
const parentPortal = readFileSync('src/features/parents/ParentPortal.tsx', 'utf8');

describe('contrats statiques de la migration Phase 2 (pas un test live RLS)', () => {
  it('active RLS pour chaque table créée et ne désactive ni ne supprime de données', () => {
    const tables = [...migration.matchAll(/create\s+table\s+public\.([a-z_]+)/gi)].map((match) => match[1]);
    expect(tables.length).toBeGreaterThan(0);
    for (const table of tables) {
      expect(migration).toMatch(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'));
    }
    expect(migration).not.toMatch(/\bdrop\s+(table|type|policy|function)\b/i);
    expect(migration).not.toMatch(/disable\s+row\s+level\s+security/i);
  });

  it('limite les demandes publiques aux rôles parent/enseignant; aucune RPC ne peut accorder admin', () => {
    expect(migration).toMatch(/p_role\s+not\s+in\s*\(\s*'parent'::public\.app_role\s*,\s*'teacher'::public\.app_role\s*\)/i);
    expect(migration).toMatch(/if\s+p_role\s+not\s+in\s*\(\s*'parent'::public\.app_role\s*,\s*'teacher'::public\.app_role\s*\)\s+then\s+raise\s+exception\s+'role_not_assignable'/i);
    expect(migration).toMatch(/approved_application_required/i);
  });

  it('n’active la liaison parent-enfant qu’après confirmation explicite de l’élève', () => {
    expect(migration).toMatch(/phase2_request_parent_link[\s\S]*?status\s*=\s*'pending'/i);
    expect(migration).toMatch(/phase2_decide_parent_link[\s\S]*?student_user_id\s*=\s*auth\.uid\(\)[\s\S]*?if\s+p_accept[\s\S]*?insert\s+into\s+public\.parent_student_links/i);
    expect(migration).toMatch(/phase2_parent_can_read_student[\s\S]*?links\.status\s*=\s*'active'/i);
  });

  it('refuse les demandes ou objectifs parentaux sans lien actif et révoque l’accès', () => {
    expect(migration).toMatch(/phase2_create_learning_goal[\s\S]*?phase2_parent_can_read_student\(p_student_user_id\)/i);
    expect(migration).toMatch(/phase2_update_learning_goal[\s\S]*?phase2_parent_can_read_student\(goals\.student_user_id\)/i);
    expect(migration).toMatch(/phase2_revoke_parent_link[\s\S]*?status\s*=\s*'revoked'/i);
  });

  it('protège les contenus privés et n’autorise que les transitions de revue administratives', () => {
    expect(migration).toMatch(/values\s*\('eduflow-teacher-contributions',[^;]*?false,/i);
    expect(migration).toMatch(/on\s+conflict\s*\(id\)\s+do\s+update\s+set[\s\S]*?public\s*=\s*false[\s\S]*?file_size_limit\s*=\s*excluded\.file_size_limit[\s\S]*?allowed_mime_types\s*=\s*excluded\.allowed_mime_types/i);
    expect(migration).toMatch(/phase2_review_content[\s\S]*?phase2_require_role\('admin'::public\.app_role\)/i);
    expect(migration).toMatch(/submission\.status\s*=\s*'submitted'[\s\S]*?p_next_status\s*=\s*'in_review'/i);
    expect(migration).toMatch(/submission\.status\s*=\s*'in_review'[\s\S]*?p_next_status\s+in\s*\('approved',\s*'rejected'\)/i);
    expect(migration).toMatch(/eduflow_teacher_file_insert_own_draft[\s\S]*?submissions\.teacher_user_id\s*=\s*\(select auth\.uid\(\)\)/i);
  });

  it('respecte la préférence in-app pour les notifications système sans exposer la RPC interne', () => {
    expect(migration).toMatch(/phase2_add_notification[\s\S]*?select preferences\.in_app_enabled[\s\S]*?insert into public\.notifications/i);
    expect(migration).toMatch(/revoke all on function public\.phase2_add_notification\(uuid, public\.notification_kind, text, text, uuid\) from public, anon, authenticated/i);
    expect(migration).toMatch(/phase2_request_parent_link[\s\S]*?phase2_add_notification\(student_id/i);
    expect(migration).toMatch(/phase2_review_content[\s\S]*?phase2_add_notification\(submission\.teacher_user_id/i);
  });

  it('retire l’accès de propriétaire aux fichiers Storage après révocation du rôle enseignant', () => {
    for (const policyName of ['read_owner_admin', 'insert_own_draft', 'update_own_draft', 'delete_own_draft']) {
      const block = migration.match(new RegExp(`create policy eduflow_teacher_file_${policyName}[\\s\\S]*?(?=\\ncreate policy|\\nrevoke all)`, 'i'))?.[0];
      expect(block, policyName).toBeDefined();
      expect(block).toMatch(/phase2_user_has_role\('teacher'::public\.app_role\)/i);
      expect(block).toMatch(/active_teacher\.is_active/i);
    }
  });

  it('charge et présente les retours de revue enseignant, et signale les listes parent tronquées', () => {
    expect(teacherPortal).toMatch(/from\('content_reviews'\)[\s\S]*?submission_id/);
    expect(teacherPortal).toMatch(/Retours de l’équipe de revue/);
    expect(parentPortal).toMatch(/count:\s*'exact'/);
    expect(parentPortal).toMatch(/Affichage des \{data\.activity\.length\}/);
    expect(parentPortal).toMatch(/activityCounts\./);
  });

  it('conserve les journaux admin en lecture seulement pour le client authentifié', () => {
    expect(migration).toMatch(/create policy admin_audit_logs_select_admin[\s\S]*?phase2_user_has_role\('admin'::public\.app_role\)/i);
    expect(migration).toMatch(/grant select on[\s\S]*?admin_audit_logs to authenticated/i);
    expect(migration).not.toMatch(/grant\s+(insert|update|delete|all)\s+on\s+public\.admin_audit_logs\s+to\s+authenticated/i);
  });
});
