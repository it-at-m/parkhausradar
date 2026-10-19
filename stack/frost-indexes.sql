-- FROST only indexes primary and foreign keys. Without this index, every request for the latest Observation
-- sorts all Observations of the Datastream. Recommended in https://fraunhoferiosb.github.io/FROST-Server/deployment/db_performance.html
create index concurrently if not exists "OBS-DS_ID-PHTIME_SE-O_ID"
  on "OBSERVATIONS"
  using btree 
  ("DATASTREAM_ID", "PHENOMENON_TIME_START" asc, "PHENOMENON_TIME_END" asc, "ID" asc)
  where ("DATASTREAM_ID" is not null);
