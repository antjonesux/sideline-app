-- Pass 2: multi-select defensive result tags on logged_plays
alter table logged_plays add column if not exists result_tags text[] default null;
