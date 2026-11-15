-- EduFlow Phase 2: espaces parent/enseignant/administration.
-- Migration additive : conserve toutes les tables, lignes et policies Phase 1.
-- Le bootstrap du premier admin reste une opération manuelle du propriétaire dans Supabase.
-- Aucune donnée de progression n'est créée ici; learning_activity est en lecture seule
-- pour les clients jusqu'à ce qu'une phase pédagogique génère des événements réels.

create type public.role_application_status as enum ('pending', 'approved', 'rejected');
create type public.parent_link_request_status as enum ('pending', 'accepted', 'rejected', 'revoked');
create type public.parent_link_status as enum ('active', 'revoked');
create type public.learning_goal_status as enum ('active', 'paused', 'achieved');
create type public.learning_activity_type as enum ('chapter_completed', 'exercise_result', 'exam_result', 'difficulty');
create type public.content_submission_type as enum ('course', 'resource', 'exercise');
create type public.content_status as enum ('draft', 'submitted', 'in_review', 'approved', 'rejected');
create type public.notification_kind as enum ('parent_link', 'role_application', 'contribution', 'admin_notice');
create type public.report_frequency as enum ('none', 'weekly', 'monthly');

create table public.role_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_role public.app_role not null check (requested_role in ('parent', 'teacher')),
  presentation text check (presentation is null or char_length(presentation) <= 2000),
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  status public.role_application_status not null default 'pending',
  review_note text check (review_note is null or char_length(review_note) <= 2000),
  reviewer_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, requested_role),
  check (cardinality(subjects) <= 30 and cardinality(levels) <= 30)
);

create table public.parent_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.teacher_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  presentation text not null default '' check (char_length(presentation) <= 2000),
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  is_active boolean not null default false,
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(subjects) <= 30 and cardinality(levels) <= 30)
);

-- Les codes sont aléatoires, à usage unique et hashés; ils ne sont jamais lisibles via RLS.
-- MD5 n'est utilisé que comme index de lookup d'un nonce aléatoire 128 bits (pas comme hash de mot de passe).
create table public.parent_invite_codes (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.parent_link_requests (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users (id) on delete cascade,
  student_user_id uuid not null references auth.users (id) on delete cascade,
  status public.parent_link_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (parent_user_id <> student_user_id)
);

create unique index parent_link_requests_pending_pair_uidx
  on public.parent_link_requests (parent_user_id, student_user_id)
  where status = 'pending';

create table public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users (id) on delete cascade,
  student_user_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null unique references public.parent_link_requests (id) on delete restrict,
  status public.parent_link_status not null default 'active',
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (parent_user_id <> student_user_id)
);

create unique index parent_student_links_active_pair_uidx
  on public.parent_student_links (parent_user_id, student_user_id)
  where status = 'active';

create table public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  target_date date,
  status public.learning_goal_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_activity (
  id uuid primary key default gen_random_uuid(),
  student_user_id uuid not null references auth.users (id) on delete cascade,
  activity_type public.learning_activity_type not null,
  source_id text check (source_id is null or char_length(source_id) <= 160),
  title text not null check (char_length(title) between 1 and 200),
  subject text check (subject is null or char_length(subject) <= 100),
  score numeric(8,2),
  score_max numeric(8,2),
  occurred_at timestamptz not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check ((score is null and score_max is null) or (score >= 0 and score_max > 0 and score <= score_max)),
  check (jsonb_typeof(details) = 'object')
);

create table public.content_submissions (
  id uuid primary key default gen_random_uuid(),
  teacher_user_id uuid not null references auth.users (id) on delete cascade,
  content_type public.content_submission_type not null,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 3000),
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  status public.content_status not null default 'draft',
  assets jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  check (cardinality(subjects) <= 30 and cardinality(levels) <= 30),
  check (jsonb_typeof(assets) = 'array' and jsonb_typeof(metadata) = 'object')
);

create table public.content_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.content_submissions (id) on delete restrict,
  reviewer_id uuid not null references auth.users (id) on delete restrict,
  status public.content_status not null check (status in ('in_review', 'approved', 'rejected')),
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  notification_type public.notification_kind not null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 2000),
  read_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  report_frequency public.report_frequency not null default 'none',
  in_app_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references auth.users (id) on delete restrict,
  action text not null check (char_length(action) between 1 and 80),
  target_user_id uuid references auth.users (id) on delete set null,
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id text check (entity_id is null or char_length(entity_id) <= 160),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index role_applications_review_idx on public.role_applications (status, created_at desc);
create index role_applications_user_idx on public.role_applications (user_id, created_at desc);
create index parent_invite_codes_student_expiry_idx on public.parent_invite_codes (student_user_id, expires_at desc);
create index parent_link_requests_student_idx on public.parent_link_requests (student_user_id, status, created_at desc);
create index parent_link_requests_parent_idx on public.parent_link_requests (parent_user_id, created_at desc);
create index parent_student_links_parent_idx on public.parent_student_links (parent_user_id, status, created_at desc);
create index parent_student_links_student_idx on public.parent_student_links (student_user_id, status, created_at desc);
create index learning_goals_student_status_idx on public.learning_goals (student_user_id, status, target_date);
create index learning_activity_student_time_idx on public.learning_activity (student_user_id, occurred_at desc);
create index content_submissions_teacher_status_idx on public.content_submissions (teacher_user_id, status, created_at desc);
create index content_submissions_status_idx on public.content_submissions (status, created_at desc);
create index content_reviews_submission_idx on public.content_reviews (submission_id, created_at desc);
create index notifications_user_time_idx on public.notifications (user_id, created_at desc);
create index admin_audit_logs_time_idx on public.admin_audit_logs (created_at desc);

-- Every new table is private by default. Future changes grant only necessary access.
alter table public.role_applications enable row level security;
alter table public.parent_profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.parent_invite_codes enable row level security;
alter table public.parent_link_requests enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.learning_goals enable row level security;
alter table public.learning_activity enable row level security;
alter table public.content_submissions enable row level security;
alter table public.content_reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on public.role_applications, public.parent_profiles, public.teacher_profiles,
  public.parent_invite_codes, public.parent_link_requests, public.parent_student_links,
  public.learning_goals, public.learning_activity, public.content_submissions,
  public.content_reviews, public.notifications, public.notification_preferences,
  public.admin_audit_logs from anon, authenticated;

-- RLS helpers use the caller identity only. They reveal neither arbitrary role membership nor other users' relationships.
create or replace function public.phase2_user_has_role(p_role public.app_role)
returns boolean
language sql stable security definer set search_path = ''
as $function$
  select auth.uid() is not null and exists (
    select 1 from public.user_roles as roles
    where roles.user_id = auth.uid() and roles.role = p_role
  );
$function$;

create or replace function public.phase2_parent_can_read_student(p_student_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $function$
  select auth.uid() is not null
    and public.phase2_user_has_role('parent'::public.app_role)
    and exists (
      select 1 from public.parent_student_links as links
      where links.parent_user_id = auth.uid()
        and links.student_user_id = p_student_user_id
        and links.status = 'active'::public.parent_link_status
    );
$function$;

create or replace function public.phase2_require_role(p_role public.app_role)
returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles as roles
    where roles.user_id = auth.uid() and roles.role = p_role
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
end;
$function$;

-- Internal event notifications respect the recipient's in-app preference.
create or replace function public.phase2_add_notification(
  p_user_id uuid, p_type public.notification_kind, p_title text, p_body text, p_created_by uuid default null
) returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  if coalesce((
    select preferences.in_app_enabled from public.notification_preferences as preferences
    where preferences.user_id = p_user_id
  ), true) then
    insert into public.notifications (user_id, notification_type, title, body, created_by)
    values (p_user_id, p_type, p_title, p_body, p_created_by);
  end if;
end;
$function$;
revoke all on function public.phase2_add_notification(uuid, public.notification_kind, text, text, uuid) from public, anon, authenticated;

revoke all on function public.phase2_user_has_role(public.app_role) from public, anon;
revoke all on function public.phase2_parent_can_read_student(uuid) from public, anon;
revoke all on function public.phase2_require_role(public.app_role) from public, anon, authenticated;
grant execute on function public.phase2_user_has_role(public.app_role) to authenticated;
grant execute on function public.phase2_parent_can_read_student(uuid) to authenticated;

-- A linked parent may read only the child's basic profile and school placement.
create policy profiles_select_parent_linked_student
  on public.profiles for select to authenticated
  using (public.phase2_parent_can_read_student(user_id));
create policy student_profiles_select_parent_linked_student
  on public.student_profiles for select to authenticated
  using (public.phase2_parent_can_read_student(user_id));

create policy role_applications_select_owner_or_admin
  on public.role_applications for select to authenticated
  using (user_id = (select auth.uid()) or public.phase2_user_has_role('admin'::public.app_role));
create policy parent_profiles_select_owner_or_admin
  on public.parent_profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.phase2_user_has_role('admin'::public.app_role));
create policy teacher_profiles_select_owner_or_admin
  on public.teacher_profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.phase2_user_has_role('admin'::public.app_role));
create policy teacher_profiles_update_own
  on public.teacher_profiles for update to authenticated
  using (user_id = (select auth.uid()) and public.phase2_user_has_role('teacher'::public.app_role) and is_active)
  with check (user_id = (select auth.uid()) and public.phase2_user_has_role('teacher'::public.app_role) and is_active);
create policy parent_link_requests_select_participants_or_admin
  on public.parent_link_requests for select to authenticated
  using (parent_user_id = (select auth.uid()) or student_user_id = (select auth.uid()) or public.phase2_user_has_role('admin'::public.app_role));
create policy parent_student_links_select_participants_or_admin
  on public.parent_student_links for select to authenticated
  using (
    (status = 'active' and (parent_user_id = (select auth.uid()) or student_user_id = (select auth.uid())))
    or public.phase2_user_has_role('admin'::public.app_role)
  );
create policy learning_goals_select_student_or_linked_parent
  on public.learning_goals for select to authenticated
  using (student_user_id = (select auth.uid()) or public.phase2_parent_can_read_student(student_user_id));
create policy learning_activity_select_student_or_linked_parent
  on public.learning_activity for select to authenticated
  using (student_user_id = (select auth.uid()) or public.phase2_parent_can_read_student(student_user_id));
create policy content_submissions_select_owner_or_admin
  on public.content_submissions for select to authenticated
  using (teacher_user_id = (select auth.uid()) or public.phase2_user_has_role('admin'::public.app_role));
create policy content_submissions_update_teacher_draft
  on public.content_submissions for update to authenticated
  using (teacher_user_id = (select auth.uid()) and public.phase2_user_has_role('teacher'::public.app_role) and status in ('draft', 'rejected'))
  with check (teacher_user_id = (select auth.uid()) and public.phase2_user_has_role('teacher'::public.app_role) and status in ('draft', 'rejected'));
create policy content_reviews_select_admin_or_submission_owner
  on public.content_reviews for select to authenticated
  using (
    public.phase2_user_has_role('admin'::public.app_role)
    or exists (
      select 1 from public.content_submissions as submissions
      where submissions.id = submission_id and submissions.teacher_user_id = (select auth.uid())
    )
  );
create policy notifications_select_owner_or_admin
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or public.phase2_user_has_role('admin'::public.app_role));
create policy notification_preferences_select_owner
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy admin_audit_logs_select_admin
  on public.admin_audit_logs for select to authenticated
  using (public.phase2_user_has_role('admin'::public.app_role));

-- Only the teacher-owned profile fields may be changed directly; role/verification remain admin controlled.
grant select on public.role_applications, public.parent_profiles, public.teacher_profiles,
  public.parent_link_requests, public.parent_student_links, public.learning_goals,
  public.learning_activity, public.content_submissions, public.content_reviews,
  public.notifications, public.notification_preferences, public.admin_audit_logs to authenticated;
grant update (presentation, subjects, levels) on public.teacher_profiles to authenticated;
grant update (subjects, levels, assets, metadata, title, description)
  on public.content_submissions to authenticated;

-- Role application is limited to parent/teacher and never grants the role itself.
create or replace function public.phase2_apply_for_role(
  p_role public.app_role,
  p_presentation text default null,
  p_subjects text[] default '{}',
  p_levels text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare application_id uuid;
begin
  if auth.uid() is null or p_role not in ('parent'::public.app_role, 'teacher'::public.app_role) then
    raise exception 'invalid_role_or_auth' using errcode = '42501';
  end if;
  if exists (select 1 from public.user_roles where user_id = auth.uid() and role = p_role) then
    raise exception 'role_already_granted';
  end if;
  insert into public.role_applications (user_id, requested_role, presentation, subjects, levels)
  values (
    auth.uid(), p_role, left(nullif(btrim(coalesce(p_presentation, '')), ''), 2000),
    coalesce(p_subjects, '{}'), coalesce(p_levels, '{}')
  )
  on conflict (user_id, requested_role) do update
    set presentation = excluded.presentation, subjects = excluded.subjects, levels = excluded.levels,
        status = 'pending', review_note = null, reviewer_id = null, reviewed_at = null, updated_at = now()
    where public.role_applications.status = 'rejected'
  returning id into application_id;
  if application_id is null then
    raise exception 'application_already_exists_or_approved';
  end if;
  return application_id;
end;
$function$;

create or replace function public.phase2_review_role_application(
  p_application_id uuid, p_approve boolean, p_note text default null
) returns void
language plpgsql security definer set search_path = ''
as $function$
declare application public.role_applications%rowtype;
begin
  perform public.phase2_require_role('admin'::public.app_role);
  select * into application from public.role_applications where id = p_application_id for update;
  if not found or application.status <> 'pending' then raise exception 'application_not_pending'; end if;
  update public.role_applications
     set status = case when p_approve then 'approved'::public.role_application_status else 'rejected'::public.role_application_status end,
         review_note = left(coalesce(p_note, ''), 2000), reviewer_id = auth.uid(), reviewed_at = now(), updated_at = now()
   where id = p_application_id;
  if p_approve then
    insert into public.user_roles (user_id, role) values (application.user_id, application.requested_role) on conflict do nothing;
    if application.requested_role = 'parent' then
      insert into public.parent_profiles (user_id) values (application.user_id) on conflict do nothing;
    else
      insert into public.teacher_profiles (user_id, presentation, subjects, levels, is_active, verified_by, verified_at)
      values (application.user_id, coalesce(application.presentation, ''), application.subjects, application.levels, true, auth.uid(), now())
      on conflict (user_id) do update set presentation = excluded.presentation, subjects = excluded.subjects,
        levels = excluded.levels, is_active = true, verified_by = auth.uid(), verified_at = now();
    end if;
  end if;
  perform public.phase2_add_notification(
    application.user_id, 'role_application'::public.notification_kind,
    case when p_approve then 'Votre demande d’accès a été approuvée' else 'Votre demande d’accès a été examinée' end,
    case when p_approve then 'Le rôle demandé est maintenant disponible dans EduFlow.' else coalesce(nullif(btrim(p_note), ''), 'La demande n’a pas été approuvée.') end,
    auth.uid()
  );
  insert into public.admin_audit_logs (admin_user_id, action, target_user_id, entity_type, entity_id, metadata)
  values (auth.uid(), 'review_role_application', application.user_id, 'role_application', p_application_id::text,
    jsonb_build_object('role', application.requested_role, 'approved', p_approve));
end;
$function$;

-- L'élève génère un code une seule fois; 128 bits d'aléa, hashé, usage unique, expiration 20 min.
create or replace function public.phase2_generate_parent_link_code() returns text
language plpgsql security definer set search_path = ''
as $function$
declare raw_code text;
begin
  perform public.phase2_require_role('student'::public.app_role);
  if not exists (select 1 from public.student_profiles where user_id = auth.uid()) then
    raise exception 'student_onboarding_required';
  end if;
  if exists (select 1 from public.parent_invite_codes where student_user_id = auth.uid() and consumed_at is null and revoked_at is null and created_at > now() - interval '1 minute') then
    raise exception 'please_wait_before_generating_another_code';
  end if;
  update public.parent_invite_codes set revoked_at = now()
   where student_user_id = auth.uid() and consumed_at is null and revoked_at is null;
  raw_code := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.parent_invite_codes (student_user_id, code_hash, expires_at)
  values (auth.uid(), md5(raw_code), now() + interval '20 minutes');
  return raw_code;
end;
$function$;

create or replace function public.phase2_request_parent_link(p_code text) returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare student_id uuid; request_id uuid;
begin
  perform public.phase2_require_role('parent'::public.app_role);
  if p_code is null or p_code !~ '^[0-9a-f]{64}$' then raise exception 'invalid_or_expired_code'; end if;
  select codes.student_user_id into student_id
    from public.parent_invite_codes as codes
   where codes.code_hash = md5(p_code) and codes.consumed_at is null
     and codes.revoked_at is null and codes.expires_at > now()
   for update;
  if student_id is null or student_id = auth.uid()
     or not exists (select 1 from public.user_roles where user_id = student_id and role = 'student'::public.app_role)
     or exists (select 1 from public.parent_student_links where parent_user_id = auth.uid() and parent_student_links.student_user_id = student_id and status = 'active') then
    raise exception 'invalid_or_expired_code';
  end if;
  if exists (select 1 from public.parent_link_requests where parent_user_id = auth.uid() and parent_link_requests.student_user_id = student_id and status = 'pending') then
    raise exception 'request_already_pending';
  end if;
  update public.parent_invite_codes set consumed_at = now() where code_hash = md5(p_code);
  insert into public.parent_link_requests (parent_user_id, student_user_id)
  values (auth.uid(), student_id) returning id into request_id;
  perform public.phase2_add_notification(student_id, 'parent_link'::public.notification_kind,
    'Demande de liaison à confirmer', 'Un compte parent demande une liaison. Accepte uniquement si tu reconnais cette demande.');
  return request_id;
end;
$function$;

create or replace function public.phase2_decide_parent_link(p_request_id uuid, p_accept boolean) returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare request public.parent_link_requests%rowtype; link_id uuid;
begin
  perform public.phase2_require_role('student'::public.app_role);
  select * into request from public.parent_link_requests
   where id = p_request_id and student_user_id = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'request_not_pending'; end if;
  if p_accept and exists (
    select 1 from public.parent_student_links where parent_user_id = request.parent_user_id
      and student_user_id = request.student_user_id and status = 'active'
  ) then raise exception 'link_already_active'; end if;
  update public.parent_link_requests
     set status = case when p_accept then 'accepted'::public.parent_link_request_status else 'rejected'::public.parent_link_request_status end,
         decided_at = now()
   where id = p_request_id;
  if p_accept then
    insert into public.parent_student_links (parent_user_id, student_user_id, request_id)
    values (request.parent_user_id, request.student_user_id, request.id) returning id into link_id;
  end if;
  perform public.phase2_add_notification(request.parent_user_id, 'parent_link'::public.notification_kind,
    case when p_accept then 'La demande de liaison a été acceptée' else 'La demande de liaison a été refusée' end,
    case when p_accept then 'La liaison est active; les informations partagées sont limitées aux progrès réellement disponibles.' else 'Aucune donnée de l’élève n’a été partagée.' end);
  return link_id;
end;
$function$;

create or replace function public.phase2_revoke_parent_link(p_link_id uuid) returns void
language plpgsql security definer set search_path = ''
as $function$
declare link public.parent_student_links%rowtype; other_user uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into link from public.parent_student_links
   where id = p_link_id and status = 'active'
     and (parent_user_id = auth.uid() or student_user_id = auth.uid()) for update;
  if not found then raise exception 'link_not_found'; end if;
  update public.parent_student_links set status = 'revoked', revoked_at = now() where id = p_link_id;
  update public.parent_link_requests set status = 'revoked' where id = link.request_id;
  other_user := case when link.parent_user_id = auth.uid() then link.student_user_id else link.parent_user_id end;
  perform public.phase2_add_notification(other_user, 'parent_link'::public.notification_kind,
    'Liaison désactivée', 'Un lien parent-enfant EduFlow a été révoqué.');
end;
$function$;

create or replace function public.phase2_create_learning_goal(
  p_student_user_id uuid, p_title text, p_description text default null, p_target_date date default null
) returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare goal_id uuid;
begin
  if auth.uid() is null or not public.phase2_parent_can_read_student(p_student_user_id) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  insert into public.learning_goals (student_user_id, created_by, title, description, target_date)
  values (p_student_user_id, auth.uid(), btrim(p_title), coalesce(p_description, ''), p_target_date)
  returning id into goal_id;
  return goal_id;
end;
$function$;

create or replace function public.phase2_update_learning_goal(
  p_goal_id uuid, p_title text, p_description text default null, p_target_date date default null
) returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.learning_goals as goals
     set title = btrim(p_title), description = coalesce(p_description, ''), target_date = p_target_date, updated_at = now()
   where goals.id = p_goal_id and goals.created_by = auth.uid() and goals.status <> 'achieved'
     and public.phase2_parent_can_read_student(goals.student_user_id);
  if not found then raise exception 'goal_not_found_or_not_editable'; end if;
end;
$function$;

create or replace function public.phase2_complete_learning_goal(p_goal_id uuid) returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  perform public.phase2_require_role('student'::public.app_role);
  update public.learning_goals as goals set status = 'achieved', updated_at = now()
   where goals.id = p_goal_id and goals.student_user_id = auth.uid();
  if not found then raise exception 'goal_not_found'; end if;
end;
$function$;

create or replace function public.phase2_update_notification_preferences(
  p_report_frequency public.report_frequency, p_in_app_enabled boolean
) returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.notification_preferences (user_id, report_frequency, in_app_enabled)
  values (auth.uid(), p_report_frequency, p_in_app_enabled)
  on conflict (user_id) do update
    set report_frequency = excluded.report_frequency, in_app_enabled = excluded.in_app_enabled, updated_at = now();
end;
$function$;

create or replace function public.phase2_create_content_draft(
  p_content_type public.content_submission_type, p_title text, p_description text default null
) returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare submission_id uuid;
begin
  perform public.phase2_require_role('teacher'::public.app_role);
  if not exists (select 1 from public.teacher_profiles where user_id = auth.uid() and is_active) then
    raise exception 'teacher_not_approved';
  end if;
  insert into public.content_submissions (teacher_user_id, content_type, title, description)
  values (auth.uid(), p_content_type, btrim(p_title), coalesce(p_description, ''))
  returning id into submission_id;
  return submission_id;
end;
$function$;

create or replace function public.phase2_submit_content(p_submission_id uuid) returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  perform public.phase2_require_role('teacher'::public.app_role);
  update public.content_submissions as submissions
     set status = 'submitted', submitted_at = now(), updated_at = now()
   where submissions.id = p_submission_id and submissions.teacher_user_id = auth.uid()
     and submissions.status in ('draft', 'rejected')
     and (char_length(btrim(submissions.description)) > 0 or jsonb_array_length(submissions.assets) > 0);
  if not found then raise exception 'draft_not_found_empty_or_not_editable'; end if;
  perform public.phase2_add_notification(roles.user_id, 'contribution'::public.notification_kind,
    'Nouvelle contribution à examiner', 'Un enseignant a soumis un contenu pour examen.')
    from public.user_roles as roles where roles.role = 'admin'::public.app_role;
end;
$function$;

create or replace function public.phase2_review_content(
  p_submission_id uuid, p_next_status public.content_status, p_note text default null
) returns void
language plpgsql security definer set search_path = ''
as $function$
declare submission public.content_submissions%rowtype;
begin
  perform public.phase2_require_role('admin'::public.app_role);
  select * into submission from public.content_submissions where id = p_submission_id for update;
  if not found then raise exception 'submission_not_found'; end if;
  if not (
    (submission.status = 'submitted' and p_next_status = 'in_review')
    or (submission.status = 'in_review' and p_next_status in ('approved', 'rejected'))
  ) then raise exception 'invalid_content_transition'; end if;
  update public.content_submissions
     set status = p_next_status, reviewed_at = case when p_next_status in ('approved', 'rejected') then now() else reviewed_at end,
         updated_at = now()
   where id = p_submission_id;
  insert into public.content_reviews (submission_id, reviewer_id, status, note)
  values (p_submission_id, auth.uid(), p_next_status, left(coalesce(p_note, ''), 2000));
  perform public.phase2_add_notification(submission.teacher_user_id, 'contribution'::public.notification_kind,
    case p_next_status when 'in_review' then 'Votre contribution est en examen' when 'approved' then 'Votre contribution a été approuvée' else 'Votre contribution a été refusée' end,
    coalesce(nullif(btrim(p_note), ''), 'Le statut de votre contribution a été mis à jour.'), auth.uid());
  insert into public.admin_audit_logs (admin_user_id, action, target_user_id, entity_type, entity_id, metadata)
  values (auth.uid(), 'review_content', submission.teacher_user_id, 'content_submission', p_submission_id::text,
    jsonb_build_object('status', p_next_status));
end;
$function$;

create or replace function public.phase2_admin_summary() returns jsonb
language plpgsql stable security definer set search_path = ''
as $function$
begin
  perform public.phase2_require_role('admin'::public.app_role);
  return jsonb_build_object(
    'students', (select count(*) from public.user_roles where role = 'student'::public.app_role),
    'parents', (select count(*) from public.user_roles where role = 'parent'::public.app_role),
    'teachers', (select count(*) from public.user_roles where role = 'teacher'::public.app_role),
    'pending_role_applications', (select count(*) from public.role_applications where status = 'pending'),
    'pending_contributions', (select count(*) from public.content_submissions where status in ('submitted', 'in_review')),
    'unread_notifications', (select count(*) from public.notifications where read_at is null)
  );
end;
$function$;

create or replace function public.phase2_admin_list_users(
  p_query text default null, p_limit integer default 50, p_offset integer default 0, p_role public.app_role default null
) returns table (user_id uuid, email text, first_name text, last_name text, roles public.app_role[], created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $function$
begin
  perform public.phase2_require_role('admin'::public.app_role);
  return query
    select users.id, users.email::text, coalesce(profiles.first_name, ''), coalesce(profiles.last_name, ''),
      coalesce(array_agg(distinct roles.role) filter (where roles.role is not null), array[]::public.app_role[]), users.created_at
    from auth.users as users
    left join public.profiles as profiles on profiles.user_id = users.id
    left join public.user_roles as roles on roles.user_id = users.id
    where (
         coalesce(p_query, '') = ''
         or coalesce(users.email, '') ilike '%' || p_query || '%'
         or coalesce(profiles.first_name, '') ilike '%' || p_query || '%'
         or coalesce(profiles.last_name, '') ilike '%' || p_query || '%'
      )
      and (p_role is null or exists (
        select 1 from public.user_roles as filtered_roles
        where filtered_roles.user_id = users.id and filtered_roles.role = p_role
      ))
    group by users.id, users.email, profiles.first_name, profiles.last_name, users.created_at
    order by users.created_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

create or replace function public.phase2_admin_set_role(
  p_user_id uuid, p_role public.app_role, p_grant boolean, p_note text default null
) returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  perform public.phase2_require_role('admin'::public.app_role);
  if p_role not in ('parent'::public.app_role, 'teacher'::public.app_role) then
    raise exception 'role_not_assignable';
  end if;
  if p_grant then
    if not exists (select 1 from public.role_applications where user_id = p_user_id and requested_role = p_role and status = 'approved') then
      raise exception 'approved_application_required';
    end if;
    insert into public.user_roles (user_id, role) values (p_user_id, p_role) on conflict do nothing;
    if p_role = 'parent' then
      insert into public.parent_profiles (user_id) values (p_user_id) on conflict do nothing;
    else
      update public.teacher_profiles set is_active = true, updated_at = now() where user_id = p_user_id;
    end if;
  else
    delete from public.user_roles where user_id = p_user_id and role = p_role;
    if p_role = 'teacher' then update public.teacher_profiles set is_active = false, updated_at = now() where user_id = p_user_id; end if;
    if p_role = 'parent' then
      update public.parent_student_links set status = 'revoked', revoked_at = now()
       where parent_user_id = p_user_id and status = 'active';
    end if;
  end if;
  insert into public.admin_audit_logs (admin_user_id, action, target_user_id, entity_type, metadata)
  values (auth.uid(), case when p_grant then 'grant_role' else 'revoke_role' end, p_user_id, 'user_role',
    jsonb_build_object('role', p_role, 'note', left(coalesce(p_note, ''), 2000)));
end;
$function$;

create or replace function public.phase2_admin_send_notification(
  p_user_id uuid, p_title text, p_body text
) returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare notification_id uuid;
begin
  perform public.phase2_require_role('admin'::public.app_role);
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'user_not_found'; end if;
  insert into public.notifications (user_id, notification_type, title, body, created_by)
  values (p_user_id, 'admin_notice', btrim(p_title), coalesce(p_body, ''), auth.uid())
  returning id into notification_id;
  insert into public.admin_audit_logs (admin_user_id, action, target_user_id, entity_type, entity_id)
  values (auth.uid(), 'send_notification', p_user_id, 'notification', notification_id::text);
  return notification_id;
end;
$function$;

create or replace function public.phase2_mark_notification_read(p_notification_id uuid) returns void
language plpgsql security definer set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.notifications set read_at = coalesce(read_at, now())
   where id = p_notification_id and user_id = auth.uid();
  if not found then raise exception 'notification_not_found'; end if;
end;
$function$;

-- RPC execution is explicit; no function is exposed to anon or PUBLIC.
revoke all on function public.phase2_apply_for_role(public.app_role, text, text[], text[]) from public, anon;
revoke all on function public.phase2_review_role_application(uuid, boolean, text) from public, anon;
revoke all on function public.phase2_generate_parent_link_code() from public, anon;
revoke all on function public.phase2_request_parent_link(text) from public, anon;
revoke all on function public.phase2_decide_parent_link(uuid, boolean) from public, anon;
revoke all on function public.phase2_revoke_parent_link(uuid) from public, anon;
revoke all on function public.phase2_create_learning_goal(uuid, text, text, date) from public, anon;
revoke all on function public.phase2_update_learning_goal(uuid, text, text, date) from public, anon;
revoke all on function public.phase2_complete_learning_goal(uuid) from public, anon;
revoke all on function public.phase2_update_notification_preferences(public.report_frequency, boolean) from public, anon;
revoke all on function public.phase2_create_content_draft(public.content_submission_type, text, text) from public, anon;
revoke all on function public.phase2_submit_content(uuid) from public, anon;
revoke all on function public.phase2_review_content(uuid, public.content_status, text) from public, anon;
revoke all on function public.phase2_admin_summary() from public, anon;
revoke all on function public.phase2_admin_list_users(text, integer, integer, public.app_role) from public, anon;
revoke all on function public.phase2_admin_set_role(uuid, public.app_role, boolean, text) from public, anon;
revoke all on function public.phase2_admin_send_notification(uuid, text, text) from public, anon;
revoke all on function public.phase2_mark_notification_read(uuid) from public, anon;
grant execute on function public.phase2_apply_for_role(public.app_role, text, text[], text[]) to authenticated;
grant execute on function public.phase2_review_role_application(uuid, boolean, text) to authenticated;
grant execute on function public.phase2_generate_parent_link_code() to authenticated;
grant execute on function public.phase2_request_parent_link(text) to authenticated;
grant execute on function public.phase2_decide_parent_link(uuid, boolean) to authenticated;
grant execute on function public.phase2_revoke_parent_link(uuid) to authenticated;
grant execute on function public.phase2_create_learning_goal(uuid, text, text, date) to authenticated;
grant execute on function public.phase2_update_learning_goal(uuid, text, text, date) to authenticated;
grant execute on function public.phase2_complete_learning_goal(uuid) to authenticated;
grant execute on function public.phase2_update_notification_preferences(public.report_frequency, boolean) to authenticated;
grant execute on function public.phase2_create_content_draft(public.content_submission_type, text, text) to authenticated;
grant execute on function public.phase2_submit_content(uuid) to authenticated;
grant execute on function public.phase2_review_content(uuid, public.content_status, text) to authenticated;
grant execute on function public.phase2_admin_summary() to authenticated;
grant execute on function public.phase2_admin_list_users(text, integer, integer, public.app_role) to authenticated;
grant execute on function public.phase2_admin_set_role(uuid, public.app_role, boolean, text) to authenticated;
grant execute on function public.phase2_admin_send_notification(uuid, text, text) to authenticated;
grant execute on function public.phase2_mark_notification_read(uuid) to authenticated;

-- Le bucket privé est dédié à EduFlow; si un bucket portant ce nom existe déjà, on ne change pas sa visibilité.
do $bucket$
begin
  if exists (select 1 from storage.buckets where id = 'eduflow-teacher-contributions' and public) then
    raise exception 'eduflow_teacher_bucket_must_be_private';
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('eduflow-teacher-contributions', 'eduflow-teacher-contributions', false, 52428800,
    array['application/pdf', 'video/mp4', 'video/webm'])
  on conflict (id) do update set
    name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
end;
$bucket$;

create policy eduflow_teacher_file_read_owner_admin
  on storage.objects for select to authenticated
  using (
    bucket_id = 'eduflow-teacher-contributions'
    and (
      public.phase2_user_has_role('admin'::public.app_role)
      or (
        owner_id = (select auth.uid())::text
        and public.phase2_user_has_role('teacher'::public.app_role)
        and exists (
          select 1 from public.teacher_profiles as active_teacher
          where active_teacher.user_id = (select auth.uid()) and active_teacher.is_active
        )
        and (storage.foldername(name))[1] = (select auth.uid())::text
        and exists (
          select 1 from public.content_submissions as submissions
          where submissions.id::text = (storage.foldername(name))[2]
            and submissions.teacher_user_id = (select auth.uid())
        )
      )
    )
  );
create policy eduflow_teacher_file_insert_own_draft
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'eduflow-teacher-contributions'
    and owner_id = (select auth.uid())::text
    and public.phase2_user_has_role('teacher'::public.app_role)
    and exists (
      select 1 from public.teacher_profiles as active_teacher
      where active_teacher.user_id = (select auth.uid()) and active_teacher.is_active
    )
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.content_submissions as submissions
      where submissions.id::text = (storage.foldername(name))[2]
        and submissions.teacher_user_id = (select auth.uid())
        and submissions.status in ('draft', 'rejected')
    )
  );
create policy eduflow_teacher_file_update_own_draft
  on storage.objects for update to authenticated
  using (
    bucket_id = 'eduflow-teacher-contributions'
    and owner_id = (select auth.uid())::text
    and public.phase2_user_has_role('teacher'::public.app_role)
    and exists (
      select 1 from public.teacher_profiles as active_teacher
      where active_teacher.user_id = (select auth.uid()) and active_teacher.is_active
    )
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.content_submissions as submissions
      where submissions.id::text = (storage.foldername(name))[2]
        and submissions.teacher_user_id = (select auth.uid())
        and submissions.status in ('draft', 'rejected')
    )
  )
  with check (
    bucket_id = 'eduflow-teacher-contributions'
    and owner_id = (select auth.uid())::text
    and public.phase2_user_has_role('teacher'::public.app_role)
    and exists (
      select 1 from public.teacher_profiles as active_teacher
      where active_teacher.user_id = (select auth.uid()) and active_teacher.is_active
    )
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.content_submissions as submissions
      where submissions.id::text = (storage.foldername(name))[2]
        and submissions.teacher_user_id = (select auth.uid())
        and submissions.status in ('draft', 'rejected')
    )
  );
create policy eduflow_teacher_file_delete_own_draft
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'eduflow-teacher-contributions'
    and owner_id = (select auth.uid())::text
    and public.phase2_user_has_role('teacher'::public.app_role)
    and exists (
      select 1 from public.teacher_profiles as active_teacher
      where active_teacher.user_id = (select auth.uid()) and active_teacher.is_active
    )
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.content_submissions as submissions
      where submissions.id::text = (storage.foldername(name))[2]
        and submissions.teacher_user_id = (select auth.uid())
        and submissions.status in ('draft', 'rejected')
    )
  );
revoke all on function public.phase2_admin_list_users(text, integer, integer, public.app_role) from public, anon;
grant execute on function public.phase2_admin_list_users(text, integer, integer, public.app_role) to authenticated;
