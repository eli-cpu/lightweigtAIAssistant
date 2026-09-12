-- for storing the chats
create table chats (
    id bigserial primary key,
    name text,
    messages jsonb not null default '[]'::jsonb
)

create table users (
    
)