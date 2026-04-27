
  create table "public"."cfb26_plays" (
    "id" uuid not null default gen_random_uuid(),
    "playbook" text not null,
    "formation" text not null,
    "formation_type" text not null,
    "play_name" text not null,
    "play_type" text,
    "is_new_in_26" boolean default false
      );



  create table "public"."dismissed_suggestions" (
    "id" uuid not null default gen_random_uuid(),
    "play_sheet_id" uuid,
    "scenario" text not null,
    "formation" text not null,
    "play_name" text not null,
    "dismissed_at" timestamp with time zone default now(),
    "dismiss_until_game_count" integer,
    "user_id" uuid not null
      );



  create table "public"."drives" (
    "id" uuid not null default gen_random_uuid(),
    "game_session_id" uuid,
    "drive_number" integer not null,
    "quarter" integer,
    "time_remaining" text,
    "starting_yard_line" integer,
    "starting_side" text,
    "score_mine" integer,
    "score_opponent" integer,
    "note" text,
    "created_at" timestamp with time zone default now(),
    "starting_down" integer,
    "starting_distance" integer,
    "is_inches" boolean default false,
    "starting_absolute_yard" integer,
    "user_id" uuid not null
      );



  create table "public"."game_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "my_playbook" text not null,
    "my_scheme" text not null,
    "opponent_team" text not null,
    "opponent_scheme" text not null,
    "game_date" date not null,
    "my_score" integer,
    "opponent_score" integer,
    "result" text,
    "is_partial_log" boolean default false,
    "created_at" timestamp with time zone default now(),
    "quarter_started_logging" integer,
    "import_source" text default 'live'::text,
    "offensive_playbook" text,
    "ended_at" timestamp with time zone,
    "play_sheet_id" uuid,
    "user_id" uuid not null
      );



  create table "public"."logged_plays" (
    "id" uuid not null default gen_random_uuid(),
    "drive_id" uuid,
    "game_session_id" uuid,
    "play_number" integer not null,
    "down" integer not null,
    "distance" integer not null,
    "yard_line" integer not null,
    "side" text not null,
    "hash" text not null,
    "field_zone" text not null,
    "scenario" text not null,
    "formation" text not null,
    "play_name" text not null,
    "yards_gained" integer,
    "result_tag" text not null,
    "note" text,
    "opponent_scheme" text not null,
    "created_at" timestamp with time zone default now(),
    "drive_number" integer,
    "is_success" boolean generated always as (
CASE
    WHEN (upper(result_tag) = 'TOUCHDOWN'::text) THEN true
    WHEN (upper(result_tag) = ANY (ARRAY['TURNOVER'::text, 'INTERCEPTION'::text, 'FUMBLE'::text])) THEN false
    WHEN (upper(result_tag) = ANY (ARRAY['FIRST DOWN'::text, 'FIRST_DOWN'::text])) THEN true
    WHEN ((down = 1) AND ((yards_gained)::numeric >= ((distance)::numeric * 0.5))) THEN true
    WHEN ((down = 2) AND ((yards_gained)::numeric >= ((distance)::numeric * 0.7))) THEN true
    WHEN ((down = ANY (ARRAY[3, 4])) AND (upper(result_tag) = ANY (ARRAY['FIRST DOWN'::text, 'FIRST_DOWN'::text, 'TOUCHDOWN'::text]))) THEN true
    ELSE false
END) stored,
    "situation_override" text,
    "is_inches" boolean default false,
    "play_type" text not null default 'RUN'::text,
    "user_id" uuid not null
      );



  create table "public"."play_sheet_plays" (
    "id" uuid not null default gen_random_uuid(),
    "scenario_id" uuid,
    "play_order" integer not null,
    "formation" text not null,
    "play_name" text not null,
    "script_note" text,
    "user_id" uuid not null
      );



  create table "public"."play_sheet_scenarios" (
    "id" uuid not null default gen_random_uuid(),
    "play_sheet_id" uuid,
    "scenario" text not null,
    "scenario_order" integer not null,
    "user_id" uuid not null
      );



  create table "public"."play_sheets" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "playbook" text not null,
    "scheme" text not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "cfb26_playbook" text,
    "user_id" uuid not null
      );



  create table "public"."scheme_play_weights" (
    "id" uuid not null default gen_random_uuid(),
    "scheme" text not null,
    "play_type" text not null,
    "weight" numeric not null,
    "suppress" boolean default false
      );



  create table "public"."team_defensive_schemes" (
    "team_name" text not null,
    "defensive_scheme" text not null
      );



  create table "public"."team_offensive_playbooks" (
    "team_name" text not null,
    "playbook_name" text not null,
    "scheme_style" text not null
      );



  create table "public"."user_profiles" (
    "id" uuid not null default gen_random_uuid(),
    "playbook" text not null,
    "scheme" text not null,
    "created_at" timestamp with time zone default now(),
    "user_id" uuid not null
      );


CREATE UNIQUE INDEX cfb26_plays_pkey ON public.cfb26_plays USING btree (id);

CREATE UNIQUE INDEX cfb26_plays_unique_play ON public.cfb26_plays USING btree (playbook, formation, play_name);

CREATE UNIQUE INDEX dismissed_suggestions_pkey ON public.dismissed_suggestions USING btree (id);

CREATE UNIQUE INDEX drives_pkey ON public.drives USING btree (id);

CREATE UNIQUE INDEX game_sessions_pkey ON public.game_sessions USING btree (id);

CREATE INDEX idx_drives_user ON public.drives USING btree (user_id);

CREATE INDEX idx_game_sessions_user ON public.game_sessions USING btree (user_id);

CREATE INDEX idx_logged_plays_user ON public.logged_plays USING btree (user_id);

CREATE INDEX idx_play_sheets_user ON public.play_sheets USING btree (user_id);

CREATE UNIQUE INDEX logged_plays_pkey ON public.logged_plays USING btree (id);

CREATE UNIQUE INDEX play_sheet_plays_pkey ON public.play_sheet_plays USING btree (id);

CREATE UNIQUE INDEX play_sheet_scenarios_pkey ON public.play_sheet_scenarios USING btree (id);

CREATE UNIQUE INDEX play_sheets_pkey ON public.play_sheets USING btree (id);

CREATE UNIQUE INDEX scheme_play_weights_pkey ON public.scheme_play_weights USING btree (id);

CREATE UNIQUE INDEX team_defensive_schemes_pkey ON public.team_defensive_schemes USING btree (team_name);

CREATE UNIQUE INDEX team_offensive_playbooks_pkey ON public.team_offensive_playbooks USING btree (team_name);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

alter table "public"."cfb26_plays" add constraint "cfb26_plays_pkey" PRIMARY KEY using index "cfb26_plays_pkey";

alter table "public"."dismissed_suggestions" add constraint "dismissed_suggestions_pkey" PRIMARY KEY using index "dismissed_suggestions_pkey";

alter table "public"."drives" add constraint "drives_pkey" PRIMARY KEY using index "drives_pkey";

alter table "public"."game_sessions" add constraint "game_sessions_pkey" PRIMARY KEY using index "game_sessions_pkey";

alter table "public"."logged_plays" add constraint "logged_plays_pkey" PRIMARY KEY using index "logged_plays_pkey";

alter table "public"."play_sheet_plays" add constraint "play_sheet_plays_pkey" PRIMARY KEY using index "play_sheet_plays_pkey";

alter table "public"."play_sheet_scenarios" add constraint "play_sheet_scenarios_pkey" PRIMARY KEY using index "play_sheet_scenarios_pkey";

alter table "public"."play_sheets" add constraint "play_sheets_pkey" PRIMARY KEY using index "play_sheets_pkey";

alter table "public"."scheme_play_weights" add constraint "scheme_play_weights_pkey" PRIMARY KEY using index "scheme_play_weights_pkey";

alter table "public"."team_defensive_schemes" add constraint "team_defensive_schemes_pkey" PRIMARY KEY using index "team_defensive_schemes_pkey";

alter table "public"."team_offensive_playbooks" add constraint "team_offensive_playbooks_pkey" PRIMARY KEY using index "team_offensive_playbooks_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."cfb26_plays" add constraint "cfb26_plays_unique_play" UNIQUE using index "cfb26_plays_unique_play";

alter table "public"."dismissed_suggestions" add constraint "dismissed_suggestions_play_sheet_id_fkey" FOREIGN KEY (play_sheet_id) REFERENCES public.play_sheets(id) not valid;

alter table "public"."dismissed_suggestions" validate constraint "dismissed_suggestions_play_sheet_id_fkey";

alter table "public"."dismissed_suggestions" add constraint "dismissed_suggestions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."dismissed_suggestions" validate constraint "dismissed_suggestions_user_id_fkey";

alter table "public"."drives" add constraint "drives_game_session_id_fkey" FOREIGN KEY (game_session_id) REFERENCES public.game_sessions(id) ON DELETE CASCADE not valid;

alter table "public"."drives" validate constraint "drives_game_session_id_fkey";

alter table "public"."drives" add constraint "drives_starting_absolute_yard_check" CHECK (((starting_absolute_yard >= 1) AND (starting_absolute_yard <= 99))) not valid;

alter table "public"."drives" validate constraint "drives_starting_absolute_yard_check";

alter table "public"."drives" add constraint "drives_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."drives" validate constraint "drives_user_id_fkey";

alter table "public"."game_sessions" add constraint "game_sessions_play_sheet_id_fkey" FOREIGN KEY (play_sheet_id) REFERENCES public.play_sheets(id) ON DELETE SET NULL not valid;

alter table "public"."game_sessions" validate constraint "game_sessions_play_sheet_id_fkey";

alter table "public"."game_sessions" add constraint "game_sessions_quarter_started_logging_check" CHECK (((quarter_started_logging >= 1) AND (quarter_started_logging <= 4))) not valid;

alter table "public"."game_sessions" validate constraint "game_sessions_quarter_started_logging_check";

alter table "public"."game_sessions" add constraint "game_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."game_sessions" validate constraint "game_sessions_user_id_fkey";

alter table "public"."logged_plays" add constraint "logged_plays_drive_id_fkey" FOREIGN KEY (drive_id) REFERENCES public.drives(id) ON DELETE CASCADE not valid;

alter table "public"."logged_plays" validate constraint "logged_plays_drive_id_fkey";

alter table "public"."logged_plays" add constraint "logged_plays_game_session_id_fkey" FOREIGN KEY (game_session_id) REFERENCES public.game_sessions(id) not valid;

alter table "public"."logged_plays" validate constraint "logged_plays_game_session_id_fkey";

alter table "public"."logged_plays" add constraint "logged_plays_play_type_check" CHECK ((play_type = ANY (ARRAY['RUN'::text, 'PASS'::text, 'RPO'::text]))) not valid;

alter table "public"."logged_plays" validate constraint "logged_plays_play_type_check";

alter table "public"."logged_plays" add constraint "logged_plays_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."logged_plays" validate constraint "logged_plays_user_id_fkey";

alter table "public"."play_sheet_plays" add constraint "play_sheet_plays_scenario_id_fkey" FOREIGN KEY (scenario_id) REFERENCES public.play_sheet_scenarios(id) ON DELETE CASCADE not valid;

alter table "public"."play_sheet_plays" validate constraint "play_sheet_plays_scenario_id_fkey";

alter table "public"."play_sheet_plays" add constraint "play_sheet_plays_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."play_sheet_plays" validate constraint "play_sheet_plays_user_id_fkey";

alter table "public"."play_sheet_scenarios" add constraint "play_sheet_scenarios_play_sheet_id_fkey" FOREIGN KEY (play_sheet_id) REFERENCES public.play_sheets(id) ON DELETE CASCADE not valid;

alter table "public"."play_sheet_scenarios" validate constraint "play_sheet_scenarios_play_sheet_id_fkey";

alter table "public"."play_sheet_scenarios" add constraint "play_sheet_scenarios_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."play_sheet_scenarios" validate constraint "play_sheet_scenarios_user_id_fkey";

alter table "public"."play_sheets" add constraint "play_sheets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."play_sheets" validate constraint "play_sheets_user_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.map_cfb_granular_type_to_badge(p_type text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select case
    when p_type is null or trim(p_type) = '' then 'RUN'
    when upper(trim(p_type)) in ('RUN', 'PASS', 'RPO') then upper(trim(p_type))
    when lower(trim(p_type)) = 'rpo' then 'RPO'
    when lower(trim(p_type)) in (
      'medium pass', 'deep pass', 'quick pass', 'play action', 'screen'
    ) then 'PASS'
    when lower(trim(p_type)) in (
      'inside run', 'outside run', 'option', 'qb run'
    ) then 'RUN'
    when lower(trim(p_type)) like '%rpo%' then 'RPO'
    when lower(trim(p_type)) like '%pass%'
      and lower(trim(p_type)) not like '%rpo%' then 'PASS'
    when lower(trim(p_type)) like '%run%' or lower(trim(p_type)) = 'option' then 'RUN'
    else 'RUN'
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_play_type(p_play_name text, p_formation text, p_playbook text, p_fallback text DEFAULT 'RUN'::text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(
    (
      select cp.play_type
      from cfb26_plays cp
      where lower(trim(cp.play_name)) = lower(trim(p_play_name))
        and lower(trim(cp.formation)) = lower(trim(p_formation))
        and lower(trim(cp.playbook)) = lower(trim(p_playbook))
      limit 1
    ),
    nullif(trim(p_fallback), '')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.touch_play_sheets_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."cfb26_plays" to "anon";

grant insert on table "public"."cfb26_plays" to "anon";

grant references on table "public"."cfb26_plays" to "anon";

grant select on table "public"."cfb26_plays" to "anon";

grant trigger on table "public"."cfb26_plays" to "anon";

grant truncate on table "public"."cfb26_plays" to "anon";

grant update on table "public"."cfb26_plays" to "anon";

grant delete on table "public"."cfb26_plays" to "authenticated";

grant insert on table "public"."cfb26_plays" to "authenticated";

grant references on table "public"."cfb26_plays" to "authenticated";

grant select on table "public"."cfb26_plays" to "authenticated";

grant trigger on table "public"."cfb26_plays" to "authenticated";

grant truncate on table "public"."cfb26_plays" to "authenticated";

grant update on table "public"."cfb26_plays" to "authenticated";

grant delete on table "public"."cfb26_plays" to "service_role";

grant insert on table "public"."cfb26_plays" to "service_role";

grant references on table "public"."cfb26_plays" to "service_role";

grant select on table "public"."cfb26_plays" to "service_role";

grant trigger on table "public"."cfb26_plays" to "service_role";

grant truncate on table "public"."cfb26_plays" to "service_role";

grant update on table "public"."cfb26_plays" to "service_role";

grant delete on table "public"."dismissed_suggestions" to "anon";

grant insert on table "public"."dismissed_suggestions" to "anon";

grant references on table "public"."dismissed_suggestions" to "anon";

grant select on table "public"."dismissed_suggestions" to "anon";

grant trigger on table "public"."dismissed_suggestions" to "anon";

grant truncate on table "public"."dismissed_suggestions" to "anon";

grant update on table "public"."dismissed_suggestions" to "anon";

grant delete on table "public"."dismissed_suggestions" to "authenticated";

grant insert on table "public"."dismissed_suggestions" to "authenticated";

grant references on table "public"."dismissed_suggestions" to "authenticated";

grant select on table "public"."dismissed_suggestions" to "authenticated";

grant trigger on table "public"."dismissed_suggestions" to "authenticated";

grant truncate on table "public"."dismissed_suggestions" to "authenticated";

grant update on table "public"."dismissed_suggestions" to "authenticated";

grant delete on table "public"."dismissed_suggestions" to "service_role";

grant insert on table "public"."dismissed_suggestions" to "service_role";

grant references on table "public"."dismissed_suggestions" to "service_role";

grant select on table "public"."dismissed_suggestions" to "service_role";

grant trigger on table "public"."dismissed_suggestions" to "service_role";

grant truncate on table "public"."dismissed_suggestions" to "service_role";

grant update on table "public"."dismissed_suggestions" to "service_role";

grant delete on table "public"."drives" to "anon";

grant insert on table "public"."drives" to "anon";

grant references on table "public"."drives" to "anon";

grant select on table "public"."drives" to "anon";

grant trigger on table "public"."drives" to "anon";

grant truncate on table "public"."drives" to "anon";

grant update on table "public"."drives" to "anon";

grant delete on table "public"."drives" to "authenticated";

grant insert on table "public"."drives" to "authenticated";

grant references on table "public"."drives" to "authenticated";

grant select on table "public"."drives" to "authenticated";

grant trigger on table "public"."drives" to "authenticated";

grant truncate on table "public"."drives" to "authenticated";

grant update on table "public"."drives" to "authenticated";

grant delete on table "public"."drives" to "service_role";

grant insert on table "public"."drives" to "service_role";

grant references on table "public"."drives" to "service_role";

grant select on table "public"."drives" to "service_role";

grant trigger on table "public"."drives" to "service_role";

grant truncate on table "public"."drives" to "service_role";

grant update on table "public"."drives" to "service_role";

grant delete on table "public"."game_sessions" to "anon";

grant insert on table "public"."game_sessions" to "anon";

grant references on table "public"."game_sessions" to "anon";

grant select on table "public"."game_sessions" to "anon";

grant trigger on table "public"."game_sessions" to "anon";

grant truncate on table "public"."game_sessions" to "anon";

grant update on table "public"."game_sessions" to "anon";

grant delete on table "public"."game_sessions" to "authenticated";

grant insert on table "public"."game_sessions" to "authenticated";

grant references on table "public"."game_sessions" to "authenticated";

grant select on table "public"."game_sessions" to "authenticated";

grant trigger on table "public"."game_sessions" to "authenticated";

grant truncate on table "public"."game_sessions" to "authenticated";

grant update on table "public"."game_sessions" to "authenticated";

grant delete on table "public"."game_sessions" to "service_role";

grant insert on table "public"."game_sessions" to "service_role";

grant references on table "public"."game_sessions" to "service_role";

grant select on table "public"."game_sessions" to "service_role";

grant trigger on table "public"."game_sessions" to "service_role";

grant truncate on table "public"."game_sessions" to "service_role";

grant update on table "public"."game_sessions" to "service_role";

grant delete on table "public"."logged_plays" to "anon";

grant insert on table "public"."logged_plays" to "anon";

grant references on table "public"."logged_plays" to "anon";

grant select on table "public"."logged_plays" to "anon";

grant trigger on table "public"."logged_plays" to "anon";

grant truncate on table "public"."logged_plays" to "anon";

grant update on table "public"."logged_plays" to "anon";

grant delete on table "public"."logged_plays" to "authenticated";

grant insert on table "public"."logged_plays" to "authenticated";

grant references on table "public"."logged_plays" to "authenticated";

grant select on table "public"."logged_plays" to "authenticated";

grant trigger on table "public"."logged_plays" to "authenticated";

grant truncate on table "public"."logged_plays" to "authenticated";

grant update on table "public"."logged_plays" to "authenticated";

grant delete on table "public"."logged_plays" to "service_role";

grant insert on table "public"."logged_plays" to "service_role";

grant references on table "public"."logged_plays" to "service_role";

grant select on table "public"."logged_plays" to "service_role";

grant trigger on table "public"."logged_plays" to "service_role";

grant truncate on table "public"."logged_plays" to "service_role";

grant update on table "public"."logged_plays" to "service_role";

grant delete on table "public"."play_sheet_plays" to "anon";

grant insert on table "public"."play_sheet_plays" to "anon";

grant references on table "public"."play_sheet_plays" to "anon";

grant select on table "public"."play_sheet_plays" to "anon";

grant trigger on table "public"."play_sheet_plays" to "anon";

grant truncate on table "public"."play_sheet_plays" to "anon";

grant update on table "public"."play_sheet_plays" to "anon";

grant delete on table "public"."play_sheet_plays" to "authenticated";

grant insert on table "public"."play_sheet_plays" to "authenticated";

grant references on table "public"."play_sheet_plays" to "authenticated";

grant select on table "public"."play_sheet_plays" to "authenticated";

grant trigger on table "public"."play_sheet_plays" to "authenticated";

grant truncate on table "public"."play_sheet_plays" to "authenticated";

grant update on table "public"."play_sheet_plays" to "authenticated";

grant delete on table "public"."play_sheet_plays" to "service_role";

grant insert on table "public"."play_sheet_plays" to "service_role";

grant references on table "public"."play_sheet_plays" to "service_role";

grant select on table "public"."play_sheet_plays" to "service_role";

grant trigger on table "public"."play_sheet_plays" to "service_role";

grant truncate on table "public"."play_sheet_plays" to "service_role";

grant update on table "public"."play_sheet_plays" to "service_role";

grant delete on table "public"."play_sheet_scenarios" to "anon";

grant insert on table "public"."play_sheet_scenarios" to "anon";

grant references on table "public"."play_sheet_scenarios" to "anon";

grant select on table "public"."play_sheet_scenarios" to "anon";

grant trigger on table "public"."play_sheet_scenarios" to "anon";

grant truncate on table "public"."play_sheet_scenarios" to "anon";

grant update on table "public"."play_sheet_scenarios" to "anon";

grant delete on table "public"."play_sheet_scenarios" to "authenticated";

grant insert on table "public"."play_sheet_scenarios" to "authenticated";

grant references on table "public"."play_sheet_scenarios" to "authenticated";

grant select on table "public"."play_sheet_scenarios" to "authenticated";

grant trigger on table "public"."play_sheet_scenarios" to "authenticated";

grant truncate on table "public"."play_sheet_scenarios" to "authenticated";

grant update on table "public"."play_sheet_scenarios" to "authenticated";

grant delete on table "public"."play_sheet_scenarios" to "service_role";

grant insert on table "public"."play_sheet_scenarios" to "service_role";

grant references on table "public"."play_sheet_scenarios" to "service_role";

grant select on table "public"."play_sheet_scenarios" to "service_role";

grant trigger on table "public"."play_sheet_scenarios" to "service_role";

grant truncate on table "public"."play_sheet_scenarios" to "service_role";

grant update on table "public"."play_sheet_scenarios" to "service_role";

grant delete on table "public"."play_sheets" to "anon";

grant insert on table "public"."play_sheets" to "anon";

grant references on table "public"."play_sheets" to "anon";

grant select on table "public"."play_sheets" to "anon";

grant trigger on table "public"."play_sheets" to "anon";

grant truncate on table "public"."play_sheets" to "anon";

grant update on table "public"."play_sheets" to "anon";

grant delete on table "public"."play_sheets" to "authenticated";

grant insert on table "public"."play_sheets" to "authenticated";

grant references on table "public"."play_sheets" to "authenticated";

grant select on table "public"."play_sheets" to "authenticated";

grant trigger on table "public"."play_sheets" to "authenticated";

grant truncate on table "public"."play_sheets" to "authenticated";

grant update on table "public"."play_sheets" to "authenticated";

grant delete on table "public"."play_sheets" to "service_role";

grant insert on table "public"."play_sheets" to "service_role";

grant references on table "public"."play_sheets" to "service_role";

grant select on table "public"."play_sheets" to "service_role";

grant trigger on table "public"."play_sheets" to "service_role";

grant truncate on table "public"."play_sheets" to "service_role";

grant update on table "public"."play_sheets" to "service_role";

grant delete on table "public"."scheme_play_weights" to "anon";

grant insert on table "public"."scheme_play_weights" to "anon";

grant references on table "public"."scheme_play_weights" to "anon";

grant select on table "public"."scheme_play_weights" to "anon";

grant trigger on table "public"."scheme_play_weights" to "anon";

grant truncate on table "public"."scheme_play_weights" to "anon";

grant update on table "public"."scheme_play_weights" to "anon";

grant delete on table "public"."scheme_play_weights" to "authenticated";

grant insert on table "public"."scheme_play_weights" to "authenticated";

grant references on table "public"."scheme_play_weights" to "authenticated";

grant select on table "public"."scheme_play_weights" to "authenticated";

grant trigger on table "public"."scheme_play_weights" to "authenticated";

grant truncate on table "public"."scheme_play_weights" to "authenticated";

grant update on table "public"."scheme_play_weights" to "authenticated";

grant delete on table "public"."scheme_play_weights" to "service_role";

grant insert on table "public"."scheme_play_weights" to "service_role";

grant references on table "public"."scheme_play_weights" to "service_role";

grant select on table "public"."scheme_play_weights" to "service_role";

grant trigger on table "public"."scheme_play_weights" to "service_role";

grant truncate on table "public"."scheme_play_weights" to "service_role";

grant update on table "public"."scheme_play_weights" to "service_role";

grant delete on table "public"."team_defensive_schemes" to "anon";

grant insert on table "public"."team_defensive_schemes" to "anon";

grant references on table "public"."team_defensive_schemes" to "anon";

grant select on table "public"."team_defensive_schemes" to "anon";

grant trigger on table "public"."team_defensive_schemes" to "anon";

grant truncate on table "public"."team_defensive_schemes" to "anon";

grant update on table "public"."team_defensive_schemes" to "anon";

grant delete on table "public"."team_defensive_schemes" to "authenticated";

grant insert on table "public"."team_defensive_schemes" to "authenticated";

grant references on table "public"."team_defensive_schemes" to "authenticated";

grant select on table "public"."team_defensive_schemes" to "authenticated";

grant trigger on table "public"."team_defensive_schemes" to "authenticated";

grant truncate on table "public"."team_defensive_schemes" to "authenticated";

grant update on table "public"."team_defensive_schemes" to "authenticated";

grant delete on table "public"."team_defensive_schemes" to "service_role";

grant insert on table "public"."team_defensive_schemes" to "service_role";

grant references on table "public"."team_defensive_schemes" to "service_role";

grant select on table "public"."team_defensive_schemes" to "service_role";

grant trigger on table "public"."team_defensive_schemes" to "service_role";

grant truncate on table "public"."team_defensive_schemes" to "service_role";

grant update on table "public"."team_defensive_schemes" to "service_role";

grant delete on table "public"."team_offensive_playbooks" to "anon";

grant insert on table "public"."team_offensive_playbooks" to "anon";

grant references on table "public"."team_offensive_playbooks" to "anon";

grant select on table "public"."team_offensive_playbooks" to "anon";

grant trigger on table "public"."team_offensive_playbooks" to "anon";

grant truncate on table "public"."team_offensive_playbooks" to "anon";

grant update on table "public"."team_offensive_playbooks" to "anon";

grant delete on table "public"."team_offensive_playbooks" to "authenticated";

grant insert on table "public"."team_offensive_playbooks" to "authenticated";

grant references on table "public"."team_offensive_playbooks" to "authenticated";

grant select on table "public"."team_offensive_playbooks" to "authenticated";

grant trigger on table "public"."team_offensive_playbooks" to "authenticated";

grant truncate on table "public"."team_offensive_playbooks" to "authenticated";

grant update on table "public"."team_offensive_playbooks" to "authenticated";

grant delete on table "public"."team_offensive_playbooks" to "service_role";

grant insert on table "public"."team_offensive_playbooks" to "service_role";

grant references on table "public"."team_offensive_playbooks" to "service_role";

grant select on table "public"."team_offensive_playbooks" to "service_role";

grant trigger on table "public"."team_offensive_playbooks" to "service_role";

grant truncate on table "public"."team_offensive_playbooks" to "service_role";

grant update on table "public"."team_offensive_playbooks" to "service_role";

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";


