create extension if not exists "uuid-ossp";
create table happenings (
  id uuid primary key default gen_random_uuid(),
  fingerprint text unique not null,
  title text not null,
  venue text, neighborhood text, date date, time_display text, datetime_start timestamptz,
  category text, description text, image_url text, source_url text not null, source_name text not null,
  editorial_score integer check (editorial_score between 1 and 10),
  editorial_notes text,
  status text default 'pending_review' check (status in ('pending_review','published','rejected')),
  scraped_at timestamptz default now(), reviewed_at timestamptz, published_at timestamptz
);
create index happenings_status_idx on happenings(status);
create index happenings_date_idx on happenings(date);
create index happenings_category_idx on happenings(category);
alter table happenings add column search_vector tsvector generated always as (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(venue,''))) stored;
create index happenings_search_idx on happenings using gin(search_vector);
create table scrape_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null, started_at timestamptz default now(), finished_at timestamptz,
  events_found integer default 0, events_new integer default 0,
  status text default 'running' check (status in ('running','success','error')), error_msg text
);
