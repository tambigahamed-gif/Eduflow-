-- EduFlow Phase 1: profils, attribution initiale sûre des rôles et taxonomie scolaire.
-- Migration additive; elle ne supprime ni ne remplace aucune table ou donnée.

create type public.app_role as enum ('student', 'parent', 'teacher', 'admin');
create type public.school_category as enum ('primary', 'middle', 'secondary');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.education_systems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country_code text not null unique check (country_code ~ '^[A-Z]{2}$'),
  locale text not null default 'fr',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.school_levels (
  id uuid primary key default gen_random_uuid(),
  education_system_id uuid not null references public.education_systems (id) on delete restrict,
  name text not null,
  category public.school_category not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  unique (education_system_id, name),
  unique (education_system_id, id)
);

create table public.school_classes (
  id uuid primary key default gen_random_uuid(),
  school_level_id uuid not null,
  name text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  foreign key (school_level_id) references public.school_levels (id) on delete restrict,
  unique (school_level_id, name),
  unique (id, school_level_id)
);

create table public.school_series (
  id uuid primary key default gen_random_uuid(),
  education_system_id uuid not null references public.education_systems (id) on delete restrict,
  code text not null check (char_length(code) between 1 and 16),
  name text not null,
  is_active boolean not null default true,
  unique (education_system_id, code),
  unique (id, education_system_id)
);

create table public.student_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  education_system_id uuid not null,
  school_level_id uuid not null,
  class_id uuid not null,
  series_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (education_system_id, school_level_id)
    references public.school_levels (education_system_id, id) on delete restrict,
  foreign key (class_id, school_level_id)
    references public.school_classes (id, school_level_id) on delete restrict,
  foreign key (series_id, education_system_id)
    references public.school_series (id, education_system_id) on delete restrict
);

create or replace function public.validate_student_series()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target_is_secondary boolean;
begin
  if new.series_id is null then
    return new;
  end if;

  select level.category = 'secondary'::public.school_category
    into target_is_secondary
    from public.school_levels as level
   where level.id = new.school_level_id
     and level.education_system_id = new.education_system_id;

  if target_is_secondary is not true then
    raise exception 'series_only_allowed_for_secondary_levels'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

revoke all on function public.validate_student_series() from public, anon, authenticated;

create trigger student_profiles_validate_series
before insert or update of education_system_id, school_level_id, series_id
on public.student_profiles
for each row execute function public.validate_student_series();

create index school_levels_system_sort_idx
  on public.school_levels (education_system_id, sort_order)
  where is_active;
create index school_classes_level_sort_idx
  on public.school_classes (school_level_id, sort_order)
  where is_active;
create index school_series_system_code_idx
  on public.school_series (education_system_id, code)
  where is_active;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row execute function public.set_updated_at();

-- Public registration can only create a student role. Incoming user metadata never selects a role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (user_id, first_name, last_name, avatar_url)
  values (
    new.id,
    left(btrim(coalesce(
      nullif(new.raw_user_meta_data ->> 'first_name', ''),
      nullif(new.raw_user_meta_data ->> 'given_name', ''),
      split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1),
      ''
    )), 80),
    left(btrim(coalesce(
      nullif(new.raw_user_meta_data ->> 'last_name', ''),
      nullif(new.raw_user_meta_data ->> 'family_name', ''),
      nullif(btrim(substr(
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
        length(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1)) + 1
      )), '')
    )), 80),
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar_url', ''), nullif(new.raw_user_meta_data ->> 'picture', ''))
  )
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'student'::public.app_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$function$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created_eduflow
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.education_systems enable row level security;
alter table public.school_levels enable row level security;
alter table public.school_classes enable row level security;
alter table public.school_series enable row level security;
alter table public.student_profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_roles_select_own"
  on public.user_roles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "education_systems_read_active"
  on public.education_systems for select to anon, authenticated
  using (is_active);
create policy "school_levels_read_active"
  on public.school_levels for select to anon, authenticated
  using (is_active);
create policy "school_classes_read_active"
  on public.school_classes for select to anon, authenticated
  using (is_active);
create policy "school_series_read_active"
  on public.school_series for select to anon, authenticated
  using (is_active);

create policy "student_profiles_select_own"
  on public.student_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "student_profiles_insert_own"
  on public.student_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "student_profiles_update_own"
  on public.student_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Grant only operations needed by the browser. The profile and role rows are created by the trigger.
revoke all on public.profiles, public.user_roles, public.student_profiles,
  public.education_systems, public.school_levels, public.school_classes, public.school_series
  from anon, authenticated;

grant select on public.profiles, public.user_roles, public.student_profiles to authenticated;
grant update (first_name, last_name, avatar_url) on public.profiles to authenticated;
grant insert, update on public.student_profiles to authenticated;
grant select on public.education_systems, public.school_levels, public.school_classes,
  public.school_series to anon, authenticated;

-- Initial configurable school structure from the EduFlow brief; this is not an official curriculum claim.
insert into public.education_systems (name, country_code, locale)
values ('Burkina Faso', 'BF', 'fr-BF')
on conflict (country_code) do nothing;

insert into public.school_levels (education_system_id, name, category, sort_order)
select system.id, levels.name, levels.category::public.school_category, levels.sort_order
from public.education_systems as system
cross join (values
  ('Primaire', 'primary', 1),
  ('Collège', 'middle', 2),
  ('Lycée', 'secondary', 3)
) as levels(name, category, sort_order)
where system.country_code = 'BF'
on conflict (education_system_id, name) do nothing;

insert into public.school_classes (school_level_id, name, sort_order)
select level.id, classes.name, classes.sort_order
from public.education_systems as system
join public.school_levels as level on level.education_system_id = system.id
join (values
  ('Primaire', 'CP1', 1), ('Primaire', 'CP2', 2),
  ('Primaire', 'CE1', 3), ('Primaire', 'CE2', 4),
  ('Primaire', 'CM1', 5), ('Primaire', 'CM2', 6),
  ('Collège', '6e', 1), ('Collège', '5e', 2),
  ('Collège', '4e', 3), ('Collège', '3e', 4),
  ('Lycée', '2nde', 1), ('Lycée', '1re', 2), ('Lycée', 'Terminale', 3)
) as classes(level_name, name, sort_order) on classes.level_name = level.name
where system.country_code = 'BF'
on conflict (school_level_id, name) do nothing;

insert into public.school_series (education_system_id, code, name)
select system.id, series.code, series.name
from public.education_systems as system
cross join (values ('A', 'Série A'), ('C', 'Série C'), ('D', 'Série D')) as series(code, name)
where system.country_code = 'BF'
on conflict (education_system_id, code) do nothing;
