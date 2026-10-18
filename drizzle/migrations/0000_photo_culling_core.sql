create type public.app_role as enum ('admin', 'photographer');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_member(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  invited_by uuid not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.invitations to authenticated;
grant all on public.invitations to service_role;
alter table public.invitations enable row level security;
create policy "Admins manage invitations select" on public.invitations for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage invitations insert" on public.invitations for insert to authenticated with check (public.has_role(auth.uid(), 'admin') and invited_by = auth.uid());
create policy "Admins manage invitations delete" on public.invitations for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Assign role: first user = admin; invited email = photographer
create or replace function public.assign_role_for_user(_user_id uuid, _email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.user_roles where user_id = _user_id) then return; end if;
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (_user_id, 'admin');
  elsif exists (select 1 from public.invitations where lower(email) = lower(_email)) then
    insert into public.user_roles(user_id, role) values (_user_id, 'photographer');
    update public.invitations set accepted_at = now() where lower(email) = lower(_email);
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.assign_role_for_user(new.id, new.email);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets an existing user claim an invitation created after their signup
create or replace function public.claim_invitation()
returns boolean language plpgsql security definer set search_path = public as $$
declare _email text;
begin
  select email into _email from auth.users where id = auth.uid();
  if _email is null then return false; end if;
  perform public.assign_role_for_user(auth.uid(), _email);
  return public.is_member(auth.uid());
end $$;
revoke execute on function public.claim_invitation() from anon;
grant execute on function public.claim_invitation() to authenticated;

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  focus_threshold int not null default 60,
  require_main_subject boolean not null default true,
  reject_eyes_closed boolean not null default true,
  reject_head_cut boolean not null default true,
  preset_name text,
  preset_xmp text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.albums to authenticated;
grant all on public.albums to service_role;
alter table public.albums enable row level security;
create policy "Owner select albums" on public.albums for select to authenticated using (owner_id = auth.uid());
create policy "Members insert albums" on public.albums for insert to authenticated with check (owner_id = auth.uid() and public.is_member(auth.uid()));
create policy "Owner update albums" on public.albums for update to authenticated using (owner_id = auth.uid());
create policy "Owner delete albums" on public.albums for delete to authenticated using (owner_id = auth.uid());

create table public.photo_results (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  owner_id uuid not null,
  file_name text not null,
  main_subject_found boolean not null,
  face_sharpness int not null,
  eyes_closed boolean not null,
  head_cut boolean not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (album_id, file_name)
);
grant select, insert, update, delete on public.photo_results to authenticated;
grant all on public.photo_results to service_role;
alter table public.photo_results enable row level security;
create policy "Owner select results" on public.photo_results for select to authenticated using (owner_id = auth.uid());
create policy "Owner insert results" on public.photo_results for insert to authenticated with check (owner_id = auth.uid());
create policy "Owner update results" on public.photo_results for update to authenticated using (owner_id = auth.uid());
create policy "Owner delete results" on public.photo_results for delete to authenticated using (owner_id = auth.uid());