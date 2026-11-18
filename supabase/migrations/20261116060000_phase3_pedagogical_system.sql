-- EduFlow Phase 3: taxonomie pédagogique configurable et contenu canonique.
-- Additif: conserve les données et les RPC/statuts Phase 1-2.

alter type public.content_submission_type add value if not exists 'lesson';
alter type public.content_submission_type add value if not exists 'video';

create type public.learning_content_status as enum ('draft', 'approved', 'published', 'archived');

-- Plusieurs systèmes éducatifs sont permis dans un même pays.
-- Preserve existing country_code values; replace only the single-system unique constraint.
alter table public.education_systems drop constraint if exists education_systems_country_code_key;
create table public.education_countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null check (char_length(name) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.education_countries(code,name,is_active)
select country_code, case when country_code='BF' then 'Burkina Faso' else country_code end, true
from public.education_systems on conflict (code) do nothing;
alter table public.education_systems add constraint education_systems_country_code_fk
  foreign key (country_code) references public.education_countries(code) on update cascade on delete restrict;

create table public.school_class_series (
 class_id uuid not null references public.school_classes(id) on delete restrict,
 series_id uuid not null references public.school_series(id) on delete restrict,
 primary key(class_id,series_id)
);
create table public.school_subjects (
 id uuid primary key default gen_random_uuid(), education_system_id uuid not null references public.education_systems(id) on delete restrict,
 code text not null check(char_length(code) between 1 and 40), name text not null check(char_length(name) between 1 and 120),
 description text not null default '', sort_order integer not null default 0 check(sort_order>=0), is_active boolean not null default true,
 unique(education_system_id,code), unique(education_system_id,id)
);
create table public.school_class_subjects (
 class_id uuid not null references public.school_classes(id) on delete restrict,
 subject_id uuid not null references public.school_subjects(id) on delete restrict,
 primary key(class_id,subject_id)
);
create table public.school_chapters (
 id uuid primary key default gen_random_uuid(), class_id uuid not null, subject_id uuid not null,
 title text not null check(char_length(title) between 1 and 200), description text not null default '',
 sort_order integer not null default 0 check(sort_order>=0), is_active boolean not null default true,
 foreign key(class_id,subject_id) references public.school_class_subjects(class_id,subject_id) on delete restrict,
 unique(id,class_id,subject_id)
);

create table public.learning_courses (
 id uuid primary key default gen_random_uuid(), education_system_id uuid not null references public.education_systems(id) on delete restrict,
 class_id uuid not null references public.school_classes(id) on delete restrict, subject_id uuid not null references public.school_subjects(id) on delete restrict,
 title text not null check(char_length(title) between 1 and 200), description text not null default '',
 status public.learning_content_status not null default 'draft', author_user_id uuid not null references auth.users(id) on delete restrict,
 approved_by uuid references auth.users(id) on delete restrict, source_submission_id uuid unique references public.content_submissions(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz, archived_at timestamptz,
 foreign key(class_id,subject_id) references public.school_class_subjects(class_id,subject_id) on delete restrict
);
create table public.learning_lessons (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.learning_courses(id) on delete restrict,
 chapter_id uuid references public.school_chapters(id) on delete restrict, title text not null check(char_length(title) between 1 and 200),
 description text not null default '', learning_objectives text[] not null default '{}', introduction text not null default '', explanation text not null default '',
 definitions jsonb not null default '[]', examples jsonb not null default '[]', formulas jsonb not null default '[]', illustrations jsonb not null default '[]', exercises jsonb not null default '[]',
 summary text not null default '', key_points text[] not null default '{}', author_user_id uuid not null references auth.users(id) on delete restrict,
 status public.learning_content_status not null default 'draft', approved_by uuid references auth.users(id) on delete restrict,
 source_submission_id uuid unique references public.content_submissions(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz, archived_at timestamptz,
 check(jsonb_typeof(definitions)='array' and jsonb_typeof(examples)='array' and jsonb_typeof(formulas)='array' and jsonb_typeof(illustrations)='array' and jsonb_typeof(exercises)='array')
);
create table public.learning_resources (
 id uuid primary key default gen_random_uuid(), lesson_id uuid references public.learning_lessons(id) on delete restrict,
 education_system_id uuid not null references public.education_systems(id) on delete restrict, class_id uuid not null, subject_id uuid not null,
 chapter_id uuid references public.school_chapters(id) on delete restrict, title text not null check(char_length(title) between 1 and 200),
 description text not null default '', resource_type text not null check(resource_type in ('pdf','document','image','illustration','revision_sheet','audio','other')),
 storage_bucket text not null default 'eduflow-learning-resources', storage_path text not null,
 mime_type text not null, file_size bigint not null check(file_size>0), downloadable boolean not null default true,
 status public.learning_content_status not null default 'draft', author_user_id uuid not null references auth.users(id) on delete restrict,
 approved_by uuid references auth.users(id) on delete restrict, source_submission_id uuid unique references public.content_submissions(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz, archived_at timestamptz,
 foreign key(class_id,subject_id) references public.school_class_subjects(class_id,subject_id) on delete restrict,
 check(storage_bucket='eduflow-learning-resources' and char_length(storage_path)>0)
);
create table public.learning_videos (
 id uuid primary key default gen_random_uuid(), lesson_id uuid references public.learning_lessons(id) on delete restrict,
 education_system_id uuid not null references public.education_systems(id) on delete restrict, class_id uuid not null, subject_id uuid not null,
 chapter_id uuid references public.school_chapters(id) on delete restrict, title text not null check(char_length(title) between 1 and 200),
 description text not null default '', provider text not null check(provider in ('youtube','vimeo')),
 external_url text not null check(external_url ~ '^https://'), thumbnail_url text check(thumbnail_url is null or thumbnail_url ~ '^https://'),
 duration_seconds integer check(duration_seconds is null or duration_seconds>0), status public.learning_content_status not null default 'draft',
 author_user_id uuid not null references auth.users(id) on delete restrict, approved_by uuid references auth.users(id) on delete restrict,
 source_submission_id uuid unique references public.content_submissions(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz, archived_at timestamptz,
 foreign key(class_id,subject_id) references public.school_class_subjects(class_id,subject_id) on delete restrict
);
create table public.student_favorites (
 owner_user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid references public.learning_lessons(id) on delete cascade,
 video_id uuid references public.learning_videos(id) on delete cascade, created_at timestamptz not null default now(),
 check((lesson_id is not null)::integer+(video_id is not null)::integer=1), unique(owner_user_id,lesson_id), unique(owner_user_id,video_id)
);
create table public.student_learning_progress (
 owner_user_id uuid not null references auth.users(id) on delete cascade, lesson_id uuid references public.learning_lessons(id) on delete cascade,
 video_id uuid references public.learning_videos(id) on delete cascade, last_position_seconds integer not null default 0 check(last_position_seconds>=0),
 last_section text, completed_at timestamptz, last_viewed_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((lesson_id is not null)::integer+(video_id is not null)::integer=1), unique(owner_user_id,lesson_id), unique(owner_user_id,video_id)
);

create index school_subjects_system_active_idx on public.school_subjects(education_system_id,sort_order) where is_active;
create index school_chapters_class_subject_idx on public.school_chapters(class_id,subject_id,sort_order) where is_active;
create index learning_courses_catalog_idx on public.learning_courses(education_system_id,class_id,subject_id,status);
create index learning_lessons_course_idx on public.learning_lessons(course_id,status);

alter table public.education_countries enable row level security;
alter table public.school_class_series enable row level security;
alter table public.school_subjects enable row level security;
alter table public.school_class_subjects enable row level security;
alter table public.school_chapters enable row level security;
alter table public.learning_courses enable row level security;
alter table public.learning_lessons enable row level security;
alter table public.learning_resources enable row level security;
alter table public.learning_videos enable row level security;
alter table public.student_favorites enable row level security;
alter table public.student_learning_progress enable row level security;
revoke all on public.education_countries,public.school_class_series,public.school_subjects,public.school_class_subjects,public.school_chapters,
 public.learning_courses,public.learning_lessons,public.learning_resources,public.learning_videos,public.student_favorites,public.student_learning_progress from anon,authenticated;
 grant select on public.education_countries,public.school_class_series,public.school_subjects,public.school_class_subjects,public.school_chapters,
 public.learning_courses,public.learning_lessons,public.learning_resources,public.learning_videos to authenticated;
grant select on public.student_favorites,public.student_learning_progress to authenticated;

create or replace function public.phase3_user_has_role(p_role public.app_role) returns boolean
language sql stable security definer set search_path='' as $f$
 select auth.uid() is not null and exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.role=p_role)
$f$;
create or replace function public.phase3_student_matches(p_system uuid,p_class uuid,p_series uuid default null) returns boolean
language sql stable security definer set search_path='' as $f$
 select auth.uid() is not null and public.phase3_user_has_role('student'::public.app_role) and exists(
  select 1 from public.student_profiles sp where sp.user_id=auth.uid() and sp.education_system_id=p_system and sp.class_id=p_class
   and (p_series is null or sp.series_id=p_series)
   and (not exists(select 1 from public.school_class_series cs where cs.class_id=sp.class_id)
        or exists(select 1 from public.school_class_series cs where cs.class_id=sp.class_id and cs.series_id=sp.series_id))
 )
$f$;
create or replace function public.phase3_lesson_readable(p_id uuid) returns boolean language sql stable security definer set search_path='' as $f$
 select exists(select 1 from public.learning_lessons l join public.learning_courses c on c.id=l.course_id
  where l.id=p_id and l.status='published' and c.status='published' and public.phase3_student_matches(c.education_system_id,c.class_id))
$f$;
create or replace function public.phase3_video_readable(p_id uuid) returns boolean language sql stable security definer set search_path='' as $f$
 select exists(select 1 from public.learning_videos v where v.id=p_id and v.status='published' and public.phase3_student_matches(v.education_system_id,v.class_id))
$f$;
revoke all on function public.phase3_user_has_role(public.app_role),public.phase3_student_matches(uuid,uuid,uuid),public.phase3_lesson_readable(uuid),public.phase3_video_readable(uuid) from public,anon;
grant execute on function public.phase3_user_has_role(public.app_role),public.phase3_student_matches(uuid,uuid,uuid),public.phase3_lesson_readable(uuid),public.phase3_video_readable(uuid) to authenticated;

create policy countries_read_active on public.education_countries for select to anon,authenticated using(is_active);
create policy class_series_read on public.school_class_series for select to authenticated using(true);
create policy subjects_read_active on public.school_subjects for select to authenticated using(is_active);
create policy class_subjects_read on public.school_class_subjects for select to authenticated using(true);
create policy chapters_read_active on public.school_chapters for select to authenticated using(is_active);
create policy courses_student_published on public.learning_courses for select to authenticated using(status='published' and public.phase3_student_matches(education_system_id,class_id));
create policy lessons_student_published on public.learning_lessons for select to authenticated using(public.phase3_lesson_readable(id));
create policy resources_student_published on public.learning_resources for select to authenticated using(status='published' and public.phase3_student_matches(education_system_id,class_id));
create policy videos_student_published on public.learning_videos for select to authenticated using(status='published' and public.phase3_student_matches(education_system_id,class_id));
create policy favorites_owner_student on public.student_favorites for all to authenticated using(owner_user_id=auth.uid() and public.phase3_user_has_role('student'::public.app_role)) with check(owner_user_id=auth.uid() and public.phase3_user_has_role('student'::public.app_role) and ((lesson_id is not null and public.phase3_lesson_readable(lesson_id)) or (video_id is not null and public.phase3_video_readable(video_id))));
create policy progress_owner_student on public.student_learning_progress for all to authenticated using(owner_user_id=auth.uid() and public.phase3_user_has_role('student'::public.app_role)) with check(owner_user_id=auth.uid() and public.phase3_user_has_role('student'::public.app_role) and ((lesson_id is not null and public.phase3_lesson_readable(lesson_id)) or (video_id is not null and public.phase3_video_readable(video_id))));

-- Seul le RPC admin de revue fait la promotion atomique des soumissions lesson/video.
create or replace function public.phase3_review_submission(p_submission_id uuid,p_next_status public.content_status,p_note text default null) returns uuid
language plpgsql security definer set search_path='' as $f$
declare s public.content_submissions%rowtype; payload jsonb; item_id uuid; course_id uuid; asset jsonb; fpath text; fname text; fmime text; fsize bigint;
begin
 perform public.phase2_require_role('admin'::public.app_role);
 select * into s from public.content_submissions where id=p_submission_id for update;
 if not found then raise exception 'submission_not_found'; end if;
 if not ((s.status='submitted' and p_next_status='in_review') or (s.status='in_review' and p_next_status in ('approved','rejected'))) then raise exception 'invalid_content_transition'; end if;
 payload:=s.metadata->'phase3';
 update public.content_submissions set status=p_next_status,reviewed_at=case when p_next_status in ('approved','rejected') then now() else reviewed_at end,updated_at=now() where id=s.id;
 insert into public.content_reviews(submission_id,reviewer_id,status,note) values(s.id,auth.uid(),p_next_status,left(coalesce(p_note,''),2000));
 if p_next_status='approved' then
  if s.content_type='lesson' then
   if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'phase3_payload_required'; end if;
   insert into public.learning_courses(education_system_id,class_id,subject_id,series_id,title,description,author_user_id,approved_by,source_submission_id,status)
    values((payload->>'education_system_id')::uuid,(payload->>'class_id')::uuid,(payload->>'subject_id')::uuid,nullif(payload->>'series_id','')::uuid,coalesce(payload->>'course_title',s.title),coalesce(payload->>'course_description',''),s.teacher_user_id,auth.uid(),s.id,'approved') returning id into course_id;
   insert into public.learning_lessons(course_id,chapter_id,title,description,learning_objectives,introduction,explanation,definitions,examples,formulas,illustrations,exercises,summary,key_points,author_user_id,approved_by,source_submission_id,status)
    values(course_id,nullif(payload->>'chapter_id','')::uuid,s.title,s.description,coalesce(array(select jsonb_array_elements_text(payload->'learning_objectives')),'{}'),coalesce(payload->>'introduction',''),coalesce(payload->>'explanation',''),coalesce(payload->'definitions','[]'),coalesce(payload->'examples','[]'),coalesce(payload->'formulas','[]'),coalesce(payload->'illustrations','[]'),coalesce(payload->'exercises','[]'),coalesce(payload->>'summary',''),coalesce(array(select jsonb_array_elements_text(payload->'key_points')),'{}'),s.teacher_user_id,auth.uid(),s.id,'approved') returning id into item_id;
  elsif s.content_type='video' then
   if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'phase3_payload_required'; end if;
   insert into public.learning_videos(education_system_id,class_id,subject_id,chapter_id,series_id,title,description,provider,external_url,thumbnail_url,duration_seconds,author_user_id,approved_by,source_submission_id,status)
    values((payload->>'education_system_id')::uuid,(payload->>'class_id')::uuid,(payload->>'subject_id')::uuid,nullif(payload->>'chapter_id','')::uuid,nullif(payload->>'series_id','')::uuid,s.title,s.description,payload->>'provider',payload->>'external_url',nullif(payload->>'thumbnail_url',''),nullif(payload->>'duration_seconds','')::integer,s.teacher_user_id,auth.uid(),s.id,'approved') returning id into item_id;
  elsif s.content_type='resource' then
   if payload is null or jsonb_typeof(payload)<>'object' or jsonb_typeof(s.assets)<>'array' or jsonb_array_length(s.assets)<1 then raise exception 'phase3_resource_asset_required'; end if;
   asset:=s.assets->0; fpath:=asset->>'path'; fname:=asset->>'name'; fmime:=asset->>'mime'; fsize:=nullif(asset->>'size','')::bigint;
   if fname is null or fname !~ '^[A-Za-z0-9][A-Za-z0-9._ -]{0,180}$' or fpath is distinct from s.teacher_user_id::text||'/'||s.id::text||'/'||fname
    or fsize is null or fsize<1 or fsize>52428800 or fmime not in ('application/pdf','image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    or not exists(select 1 from storage.objects o where o.bucket_id='eduflow-teacher-contributions' and o.name=fpath) then raise exception 'invalid_resource_asset'; end if;
   if lower(fname) !~ '\.(pdf|docx|jpg|jpeg|png|webp|mp3|m4a|mp4|txt)$' then raise exception 'invalid_resource_extension'; end if;
   insert into public.learning_resources(education_system_id,class_id,subject_id,chapter_id,series_id,title,description,resource_type,storage_bucket,storage_path,mime_type,file_size,author_user_id,approved_by,source_submission_id,status)
    values((payload->>'education_system_id')::uuid,(payload->>'class_id')::uuid,(payload->>'subject_id')::uuid,nullif(payload->>'chapter_id','')::uuid,nullif(payload->>'series_id','')::uuid,coalesce(payload->>'title',s.title),coalesce(payload->>'description',s.description),coalesce(payload->>'resource_type','document'),'eduflow-teacher-contributions',fpath,fmime,fsize,s.teacher_user_id,auth.uid(),s.id,'approved') returning id into item_id;
  else raise exception 'phase3_unsupported_submission_type'; end if;
 end if;
 insert into public.admin_audit_logs(admin_user_id,action,target_user_id,entity_type,entity_id,metadata) values(auth.uid(),'phase3_review_submission',s.teacher_user_id,'content_submission',s.id::text,jsonb_build_object('status',p_next_status,'promoted_content_id',item_id));
 return item_id;
end $f$;
revoke all on function public.phase3_review_submission(uuid,public.content_status,text) from public,anon;
grant execute on function public.phase3_review_submission(uuid,public.content_status,text) to authenticated;

-- Canonique administré par RPC uniquement: aucun grant d'écriture client sur les tables de contenu.
create or replace function public.phase3_admin_publish(p_kind text,p_id uuid,p_publish boolean) returns void
language plpgsql security definer set search_path='' as $f$
begin
 perform public.phase2_require_role('admin'::public.app_role);
 if p_kind='course' then update public.learning_courses set status=case when p_publish then 'published'::public.learning_content_status else 'archived'::public.learning_content_status end,approved_by=auth.uid(),published_at=case when p_publish then now() else published_at end,archived_at=case when p_publish then null else now() end,updated_at=now() where id=p_id and status in ('approved','published');
 elsif p_kind='lesson' then update public.learning_lessons set status=case when p_publish then 'published'::public.learning_content_status else 'archived'::public.learning_content_status end,approved_by=auth.uid(),published_at=case when p_publish then now() else published_at end,archived_at=case when p_publish then null else now() end,updated_at=now() where id=p_id and status in ('approved','published');
 elsif p_kind='video' then update public.learning_videos set status=case when p_publish then 'published'::public.learning_content_status else 'archived'::public.learning_content_status end,approved_by=auth.uid(),published_at=case when p_publish then now() else published_at end,archived_at=case when p_publish then null else now() end,updated_at=now() where id=p_id and status in ('approved','published');
 elsif p_kind='resource' then update public.learning_resources set status=case when p_publish then 'published'::public.learning_content_status else 'archived'::public.learning_content_status end,approved_by=auth.uid(),published_at=case when p_publish then now() else published_at end,archived_at=case when p_publish then null else now() end,updated_at=now() where id=p_id and status in ('approved','published');
 else raise exception 'invalid_content_kind'; end if;
 if not found then raise exception 'content_not_approvable'; end if;
 insert into public.admin_audit_logs(admin_user_id,action,entity_type,entity_id,metadata) values(auth.uid(),'phase3_admin_publish',p_kind,p_id::text,jsonb_build_object('published',p_publish));
end $f$;
revoke all on function public.phase3_admin_publish(text,uuid,boolean) from public,anon;
grant execute on function public.phase3_admin_publish(text,uuid,boolean) to authenticated;

-- Private bucket only when absent; do not alter visibility or configuration of an existing bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('eduflow-learning-resources','eduflow-learning-resources',false,52428800,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','text/plain'])
on conflict(id) do nothing;
-- Access to teacher-uploaded objects is tied to a published and eligible canonical resource path.
create policy phase3_learning_resource_read on storage.objects for select to authenticated using(bucket_id='eduflow-learning-resources' and exists(
 select 1 from public.learning_resources r where r.storage_bucket=storage.objects.bucket_id and r.storage_path=storage.objects.name and r.status='published' and public.phase3_student_matches(r.education_system_id,r.class_id)
));

-- Phase 3 hardening: admin-only CMS writes, auditable and scoped content.
alter table public.learning_courses add column series_id uuid references public.school_series(id) on delete restrict;
alter table public.learning_resources add column series_id uuid references public.school_series(id) on delete restrict;
alter table public.learning_videos add column series_id uuid references public.school_series(id) on delete restrict;
drop policy if exists phase3_learning_resource_read on storage.objects;
-- Resource type allowlist is defined exactly once in the table declaration.
alter table public.learning_resources add constraint learning_resources_storage_bucket_check
  check(storage_bucket in ('eduflow-learning-resources','eduflow-teacher-contributions') and char_length(storage_path)>0);
alter table public.student_favorites drop constraint if exists student_favorites_check;
alter table public.student_favorites add constraint student_favorites_exactly_one_target
  check ((lesson_id is not null and video_id is null) or (lesson_id is null and video_id is not null));
alter table public.student_learning_progress drop constraint if exists student_learning_progress_check;
alter table public.student_learning_progress add constraint student_progress_exactly_one_target
  check ((lesson_id is not null and video_id is null) or (lesson_id is null and video_id is not null));

-- Phase 1 catalogs retain SELECT and gain admin-only insert/update, never DELETE.
grant insert,update on public.education_systems,public.school_levels,public.school_classes,public.school_series to authenticated;
create policy phase3_education_systems_admin_manage on public.education_systems for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy phase3_school_levels_admin_manage on public.school_levels for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy phase3_school_classes_admin_manage on public.school_classes for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy phase3_school_series_admin_manage on public.school_series for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
-- Admins may manage every Phase 3 catalog/content row; no teacher write grant/policy is added.
grant insert,update on public.education_countries,public.school_class_series,public.school_subjects,
 public.school_class_subjects,public.school_chapters,public.learning_courses,public.learning_lessons,
 public.learning_resources,public.learning_videos to authenticated;
grant delete on public.school_class_series,public.school_class_subjects to authenticated;
create policy countries_admin_manage on public.education_countries for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy class_series_admin_manage on public.school_class_series for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy subjects_admin_manage on public.school_subjects for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy class_subjects_admin_manage on public.school_class_subjects for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy chapters_admin_manage on public.school_chapters for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy courses_admin_manage on public.learning_courses for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy lessons_admin_manage on public.learning_lessons for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy resources_admin_manage on public.learning_resources for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));
create policy videos_admin_manage on public.learning_videos for all to authenticated using(public.phase3_user_has_role('admin'::public.app_role)) with check(public.phase3_user_has_role('admin'::public.app_role));

-- Reject cross-system class/subject and class/series associations.
create or replace function public.phase3_validate_class_subject() returns trigger language plpgsql security definer set search_path='' as $f$
begin
 if not exists(select 1 from public.school_classes c join public.school_levels l on l.id=c.school_level_id join public.school_subjects s on s.id=new.subject_id where c.id=new.class_id and l.education_system_id=s.education_system_id) then raise exception 'class_subject_system_mismatch'; end if;
 return new;
end $f$;
create trigger phase3_class_subject_system before insert or update on public.school_class_subjects for each row execute function public.phase3_validate_class_subject();
create or replace function public.phase3_validate_class_series() returns trigger language plpgsql security definer set search_path='' as $f$
begin
 if not exists(select 1 from public.school_classes c join public.school_levels l on l.id=c.school_level_id join public.school_series s on s.id=new.series_id where c.id=new.class_id and l.education_system_id=s.education_system_id) then raise exception 'class_series_system_mismatch'; end if;
 return new;
end $f$;
create trigger phase3_class_series_system before insert or update on public.school_class_series for each row execute function public.phase3_validate_class_series();
-- Enforce class/system/subject/chapter/course scope regardless of trusted CMS client.
create or replace function public.phase3_validate_content_scope() returns trigger language plpgsql security definer set search_path='' as $f$
declare sys uuid; cls uuid; subj uuid;
begin
 if tg_table_name='learning_courses' then
  select l.education_system_id into sys from public.school_classes c join public.school_levels l on l.id=c.school_level_id where c.id=new.class_id;
  if not exists(select 1 from public.school_subjects s where s.id=new.subject_id and s.education_system_id=new.education_system_id) or sys is distinct from new.education_system_id then raise exception 'content_scope_mismatch'; end if;
  if new.series_id is not null and not exists(select 1 from public.school_series x join public.school_class_series cs on cs.series_id=x.id where x.id=new.series_id and x.education_system_id=new.education_system_id and cs.class_id=new.class_id) then raise exception 'series_scope_mismatch'; end if;
 elsif tg_table_name in ('learning_resources','learning_videos') then
  select l.education_system_id into sys from public.school_classes c join public.school_levels l on l.id=c.school_level_id where c.id=new.class_id;
  if sys is distinct from new.education_system_id or not exists(select 1 from public.school_subjects s where s.id=new.subject_id and s.education_system_id=new.education_system_id) then raise exception 'content_scope_mismatch'; end if;
  if new.chapter_id is not null and not exists(select 1 from public.school_chapters h where h.id=new.chapter_id and h.class_id=new.class_id and h.subject_id=new.subject_id) then raise exception 'chapter_scope_mismatch'; end if;
  if new.series_id is not null and not exists(select 1 from public.school_series x join public.school_class_series cs on cs.series_id=x.id where x.id=new.series_id and x.education_system_id=new.education_system_id and cs.class_id=new.class_id) then raise exception 'series_scope_mismatch'; end if;
  if new.lesson_id is not null and not exists(select 1 from public.learning_lessons le join public.learning_courses co on co.id=le.course_id where le.id=new.lesson_id and co.education_system_id=new.education_system_id and co.class_id=new.class_id and co.subject_id=new.subject_id and (co.series_id is null or co.series_id=new.series_id)) then raise exception 'lesson_scope_mismatch'; end if;
 elsif tg_table_name='learning_lessons' and new.chapter_id is not null then
  if not exists(select 1 from public.school_chapters h join public.learning_courses c on c.class_id=h.class_id and c.subject_id=h.subject_id where h.id=new.chapter_id and c.id=new.course_id) then raise exception 'chapter_scope_mismatch'; end if;
 end if;
 return new;
end $f$;
create trigger phase3_courses_scope before insert or update on public.learning_courses for each row execute function public.phase3_validate_content_scope();
create trigger phase3_lessons_scope before insert or update on public.learning_lessons for each row execute function public.phase3_validate_content_scope();
create trigger phase3_resources_scope before insert or update on public.learning_resources for each row execute function public.phase3_validate_content_scope();
create trigger phase3_videos_scope before insert or update on public.learning_videos for each row execute function public.phase3_validate_content_scope();

create or replace function public.phase3_student_matches(p_system uuid,p_class uuid,p_series uuid default null) returns boolean language sql stable security definer set search_path='' as $f$
 select auth.uid() is not null and public.phase3_user_has_role('student'::public.app_role) and exists(
 select 1 from public.student_profiles sp join public.school_classes c on c.id=sp.class_id join public.school_levels l on l.id=c.school_level_id
 where sp.user_id=auth.uid() and sp.education_system_id=p_system and l.education_system_id=p_system and sp.class_id=p_class
 and (p_series is null or sp.series_id=p_series)
 and (not exists(select 1 from public.school_class_series cs where cs.class_id=sp.class_id) or exists(select 1 from public.school_class_series cs where cs.class_id=sp.class_id and cs.series_id=sp.series_id)))
$f$;
create or replace function public.phase3_lesson_readable(p_id uuid) returns boolean language sql stable security definer set search_path='' as $f$
 select exists(select 1 from public.learning_lessons l join public.learning_courses c on c.id=l.course_id where l.id=p_id and l.status='published' and c.status='published' and public.phase3_student_matches(c.education_system_id,c.class_id,c.series_id))
$f$;
create or replace function public.phase3_video_readable(p_id uuid) returns boolean language sql stable security definer set search_path='' as $f$
 select exists(select 1 from public.learning_videos v where v.id=p_id and v.status='published' and public.phase3_student_matches(v.education_system_id,v.class_id,v.series_id))
$f$;
drop policy if exists courses_student_published on public.learning_courses;
create policy courses_student_published on public.learning_courses for select to authenticated using(status='published' and public.phase3_student_matches(education_system_id,class_id,series_id));
drop policy if exists resources_student_published on public.learning_resources;
create policy resources_student_published on public.learning_resources for select to authenticated using(status='published' and public.phase3_student_matches(education_system_id,class_id,series_id));
drop policy if exists videos_student_published on public.learning_videos;
create policy videos_student_published on public.learning_videos for select to authenticated using(status='published' and public.phase3_student_matches(education_system_id,class_id,series_id));

-- Audit each successful direct admin insert/update/delete (not object deletion).
create or replace function public.phase3_audit_admin_content() returns trigger language plpgsql security definer set search_path='' as $f$
declare rowdata jsonb; rid text;
begin
 rowdata:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 rid:=coalesce(rowdata->>'id',rowdata->>'code',rowdata->>'class_id');
 insert into public.admin_audit_logs(admin_user_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'phase3_'||lower(tg_op),tg_table_name,rid,jsonb_build_object('row',rowdata));
 return case when tg_op='DELETE' then old else new end;
end $f$;
do $f$ declare t text; begin foreach t in array array['education_systems','school_levels','school_classes','school_series','education_countries','school_class_series','school_subjects','school_class_subjects','school_chapters','learning_courses','learning_lessons','learning_resources','learning_videos'] loop execute format('create trigger %I after insert or update or delete on public.%I for each row when (public.phase3_user_has_role(''admin''::public.app_role)) execute function public.phase3_audit_admin_content()', 'phase3_audit_'||t,t); end loop; end $f$;

-- Student-only, owner-bound favorite and progress APIs.
create or replace function public.phase3_toggle_favorite(p_lesson_id uuid,p_video_id uuid,p_favorite boolean) returns void language plpgsql security definer set search_path='' as $f$
begin
 perform public.phase2_require_role('student'::public.app_role);
 if (p_lesson_id is null)=(p_video_id is null) then raise exception 'exactly_one_content_required'; end if;
 if p_lesson_id is not null and not public.phase3_lesson_readable(p_lesson_id) or p_video_id is not null and not public.phase3_video_readable(p_video_id) then raise exception 'content_not_eligible'; end if;
 if p_favorite then insert into public.student_favorites(owner_user_id,lesson_id,video_id) values(auth.uid(),p_lesson_id,p_video_id) on conflict do nothing;
 else delete from public.student_favorites where owner_user_id=auth.uid() and lesson_id is not distinct from p_lesson_id and video_id is not distinct from p_video_id; end if;
end $f$;
create or replace function public.phase3_update_progress(p_lesson_id uuid,p_video_id uuid,p_position_seconds integer,p_last_section text,p_completed boolean) returns void language plpgsql security definer set search_path='' as $f$
begin
 perform public.phase2_require_role('student'::public.app_role);
 if (p_lesson_id is null)=(p_video_id is null) or p_position_seconds is null or p_position_seconds<0 or char_length(coalesce(p_last_section,''))>200 then raise exception 'invalid_progress'; end if;
 if p_lesson_id is not null and not public.phase3_lesson_readable(p_lesson_id) or p_video_id is not null and not public.phase3_video_readable(p_video_id) then raise exception 'content_not_eligible'; end if;
 if p_lesson_id is not null then
  insert into public.student_learning_progress(owner_user_id,lesson_id,video_id,last_position_seconds,last_section,completed_at,last_viewed_at,updated_at) values(auth.uid(),p_lesson_id,null,p_position_seconds,nullif(p_last_section,''),case when p_completed then now() else null end,now(),now()) on conflict (owner_user_id,lesson_id) do update set last_position_seconds=excluded.last_position_seconds,last_section=excluded.last_section,completed_at=coalesce(public.student_learning_progress.completed_at,excluded.completed_at),last_viewed_at=now(),updated_at=now();
 else
  insert into public.student_learning_progress(owner_user_id,lesson_id,video_id,last_position_seconds,last_section,completed_at,last_viewed_at,updated_at) values(auth.uid(),null,p_video_id,p_position_seconds,nullif(p_last_section,''),case when p_completed then now() else null end,now(),now()) on conflict (owner_user_id,video_id) do update set last_position_seconds=excluded.last_position_seconds,last_section=excluded.last_section,completed_at=coalesce(public.student_learning_progress.completed_at,excluded.completed_at),last_viewed_at=now(),updated_at=now();
 end if;
end $f$;
revoke all on function public.phase3_toggle_favorite(uuid,uuid,boolean),public.phase3_update_progress(uuid,uuid,integer,text,boolean) from public,anon;
grant execute on function public.phase3_toggle_favorite(uuid,uuid,boolean),public.phase3_update_progress(uuid,uuid,integer,text,boolean) to authenticated;

-- Exact-object student reads; contribution bucket owner/admin Phase 2 policies are untouched.
create policy phase3_learning_resource_contribution_read on storage.objects for select to authenticated using(bucket_id in ('eduflow-learning-resources','eduflow-teacher-contributions') and exists(select 1 from public.learning_resources r where r.storage_bucket=storage.objects.bucket_id and r.storage_path=storage.objects.name and r.status='published' and public.phase3_student_matches(r.education_system_id,r.class_id,r.series_id)));
create policy phase3_library_admin_read on storage.objects for select to authenticated using(bucket_id='eduflow-learning-resources' and public.phase3_user_has_role('admin'::public.app_role));
create policy phase3_library_admin_insert on storage.objects for insert to authenticated with check(bucket_id='eduflow-learning-resources' and public.phase3_user_has_role('admin'::public.app_role));
-- Deliberately no object UPDATE/DELETE policies for admins in the library bucket.

-- Parents may read a linked child's progress; all writes remain student-owner only.
create policy progress_parent_read on public.student_learning_progress for select to authenticated using(public.phase2_parent_can_read_student(owner_user_id));
