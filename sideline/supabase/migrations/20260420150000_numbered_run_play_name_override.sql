-- Align with `shouldOverrideCfbPassLabelToRun` in `playbook.ts`: numbered personnel calls (e.g. "94 WILL")
-- stored as PASS from granular CFB labels should be RUN when the name has no explicit pass/RPO cue.

update logged_plays
set play_type = 'RUN'
where play_type = 'PASS'
  and play_name ~ '^(0[1-9]|[1-9][0-9]?) '
  and lower(play_name) not like '%rpo%'
  and lower(play_name) not like '%pass%'
  and lower(play_name) not like '%mesh%'
  and lower(play_name) not like '%slant%'
  and lower(play_name) not like '%stick%'
  and lower(play_name) not like '%spot%'
  and lower(play_name) not like '%drive%'
  and lower(play_name) not like '%flood%'
  and lower(play_name) not like '%curl%'
  and lower(play_name) not like '%vert%'
  and lower(play_name) not like '%cross%'
  and lower(play_name) not like '%spacing%'
  and lower(play_name) not like '%post%';
