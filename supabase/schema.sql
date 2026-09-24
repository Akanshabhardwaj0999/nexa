-- Nexa database schema.
-- Safe to run more than once in the Supabase SQL editor.
-- Realtime sync uses broadcast + presence channels, so no
-- table needs to be added to the realtime publication.

create extension if not exists "pgcrypto";

create table if not exists public.rooms (
    id uuid primary key default gen_random_uuid(),
    room_code text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists public.room_members (
    id uuid primary key default gen_random_uuid(),
    room_id uuid not null references public.rooms (id) on delete cascade,
    user_name text not null,
    joined_at timestamptz not null default now()
);

create table if not exists public.playlist_tracks (
    id uuid primary key default gen_random_uuid(),
    room_id uuid not null references public.rooms (id) on delete cascade,
    track_id text not null,
    title text not null,
    artist text not null,
    image_url text,
    audio_url text,
    duration integer,
    position integer not null default 0,
    added_by text,
    created_at timestamptz not null default now(),
    unique (room_id, track_id)
);

create table if not exists public.room_playback (
    room_id uuid primary key references public.rooms (id) on delete cascade,
    track_id text,
    is_playing boolean not null default false,
    position double precision not null default 0,
    updated_at timestamptz not null default now(),
    updated_by text
);

create table if not exists public.room_messages (
    -- Made by the sender, so the live copy of a message and the
    -- saved copy can be matched.
    id text primary key,
    room_id uuid not null references public.rooms (id) on delete cascade,
    client_id text not null,
    user_name text not null,
    body text not null check (char_length(body) between 1 and 1000),
    created_at timestamptz not null default now()
);

create index if not exists playlist_tracks_room_position_idx
    on public.playlist_tracks (room_id, position);

create index if not exists room_messages_room_created_idx
    on public.room_messages (room_id, created_at);

-- Nexa has no login: anyone with a room code can use the room.
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.room_playback enable row level security;
alter table public.room_messages enable row level security;

do $$
declare
    t text;
begin
    foreach t in array array['rooms', 'room_members', 'playlist_tracks', 'room_playback', 'room_messages']
    loop
        if not exists (
            select 1 from pg_policies
            where schemaname = 'public' and tablename = t and policyname = 'nexa_public_access'
        ) then
            execute format(
                'create policy nexa_public_access on public.%I for all to anon, authenticated using (true) with check (true)',
                t
            );
        end if;
    end loop;
end $$;

-- Rooms are for two people. Refuse a third name joining a room
-- (names are matched ignoring case, like the app does).
create or replace function public.nexa_limit_room_members()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Lock the room so two people joining at once are checked in turn.
    perform 1 from public.rooms where id = new.room_id for update;

    if not exists (
        select 1 from public.room_members
        where room_id = new.room_id
          and lower(trim(user_name)) = lower(trim(new.user_name))
    ) and (
        select count(distinct lower(trim(user_name)))
        from public.room_members
        where room_id = new.room_id
    ) >= 2 then
        raise exception 'room_full' using errcode = 'P0001';
    end if;

    return new;
end;
$$;

drop trigger if exists nexa_limit_room_members on public.room_members;

create trigger nexa_limit_room_members
    before insert on public.room_members
    for each row execute function public.nexa_limit_room_members();
