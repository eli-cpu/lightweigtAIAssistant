create table chats (
    id bigserial primary key,
    user_id bigint not null references users(id) on delete cascade,
    name text not null,
    messages jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
)

create table users (
    id bigserial primary key,
    username text not null unique,
    email text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now()
)