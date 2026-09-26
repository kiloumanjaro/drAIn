SET local check_function_bodies = off;

DROP FUNCTION "public"."get_closest_inlet"(double precision, double precision);

DROP FUNCTION "public"."get_closest_man_pipe"(double precision, double precision);

DROP FUNCTION "public"."get_closest_outlet"(double precision, double precision);

DROP FUNCTION "public"."get_closest_storm_drain"(double precision, double precision);

DROP FUNCTION "public"."get_component_by_category"(text);

-- Hand-edited: the drops of the eight "<N>YR" tables moved below, after
-- their rows are copied into flood_results.

CREATE TABLE "public"."components" (
  "name"     text                             NOT NULL,
  "type"     public.component_type            NOT NULL,
  "location" extensions.geography(Point,4326) NOT NULL,
  CONSTRAINT "components_pkey" PRIMARY KEY (name)
);

ALTER TABLE "public"."components"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."flood_results" (
  "return_period"                 smallint         NOT NULL,
  "node_id"                       text             NOT NULL,
  "vulnerability_category"        text,
  "vulnerability_rank"            integer,
  "cluster"                       integer,
  "cluster_score"                 double precision,
  "time_after_raining_min"        double precision,
  "hours_flooded"                 double precision,
  "max_rate_cms"                  double precision,
  "time_of_max"                   integer,
  "total_flood_volume_megalitres" double precision,
  CONSTRAINT "flood_results_pkey" PRIMARY KEY (return_period, node_id),
  CONSTRAINT "flood_results_return_period_check" CHECK ((return_period = ANY (ARRAY[2, 5, 10, 15, 20, 25, 50, 100])))
);

ALTER TABLE "public"."flood_results"
  ENABLE ROW LEVEL SECURITY;

-- Hand-edited: carry existing rows over before the old tables go
-- (declarative sync writes DDL only). On a fresh database these tables are
-- empty; the seed fills flood_results and components afterwards.
INSERT INTO public.flood_results
  (return_period, node_id, vulnerability_category, vulnerability_rank, cluster, cluster_score,
   time_after_raining_min, hours_flooded, max_rate_cms, time_of_max, total_flood_volume_megalitres)
SELECT 100, "Node_ID", "Vulnerability_Category", "Vulnerability_Rank", "Cluster", "Cluster_Score",
       "Time_After_Raining_min", "Hours Flooded", "Maximum Rate (CMS)", "Time of Max (hr:min)",
       "Total Flood Volume (10^6 ltr)"
FROM "public"."100YR" WHERE "Node_ID" IS NOT NULL
UNION ALL
SELECT 10, "Node_ID", "Vulnerability_Category", "Vulnerability_Rank", "Cluster", "Cluster_Score",
       "Time_After_Raining_min", "Hours Flooded", "Maximum Rate (CMS)", "Time of Max (hr:min)",
       "Total Flood Volume (10^6 ltr)"
FROM "public"."10YR" WHERE "Node_ID" IS NOT NULL
UNION ALL
SELECT 15, "Node_ID", "Vulnerability_Category", "Vulnerability_Rank", "Cluster", "Cluster_Score",
       "Time_After_Raining_min", "Hours Flooded", "Maximum Rate (CMS)", "Time of Max (hr:min)",
       "Total Flood Volume (10^6 ltr)"
FROM "public"."15YR" WHERE "Node_ID" IS NOT NULL
UNION ALL
SELECT 20, "Node_ID", "Vulnerability_Category", "Vulnerability_Rank", "Cluster", "Cluster_Score",
       "Time_After_Raining_min", "Hours Flooded", "Maximum Rate (CMS)", "Time of Max (hr:min)",
       "Total Flood Volume (10^6 ltr)"
FROM "public"."20YR" WHERE "Node_ID" IS NOT NULL
UNION ALL
SELECT 25, "Node_ID", "Vulnerability_Category", "Vulnerability_Rank", "Cluster", "Cluster_Score",
       "Time_After_Raining_min", "Hours Flooded", "Maximum Rate (CMS)", "Time of Max (hr:min)",
       "Total Flood Volume (10^6 ltr)"
FROM "public"."25YR" WHERE "Node_ID" IS NOT NULL
UNION ALL
SELECT 2, "Node_ID", "Vulnerability_Category", "Vulnerability_Rank", "Cluster", "Cluster_Score",
       "Time_After_Raining_min", "Hours Flooded", "Maximum Rate (CMS)", "Time of Max (hr:min)",
       "Total Flood Volume (10^6 ltr)"
FROM "public"."2YR" WHERE "Node_ID" IS NOT NULL
UNION ALL
SELECT 50, "Node_ID", "Vulnerability_Category", "Vulnerability_Rank", "Cluster", "Cluster_Score",
       "Time_After_Raining_min", "Hours Flooded", "Maximum Rate (CMS)", "Time of Max (hr:min)",
       "Total Flood Volume (10^6 ltr)"
FROM "public"."50YR" WHERE "Node_ID" IS NOT NULL
UNION ALL
SELECT 5, "Node_ID", "Vulnerability_Category", "Vulnerability_Rank", "Cluster", "Cluster_Score",
       "Time_After_Raining_min", "Hours Flooded", "Maximum Rate (CMS)", "Time of Max (hr:min)",
       "Total Flood Volume (10^6 ltr)"
FROM "public"."5YR" WHERE "Node_ID" IS NOT NULL;

DROP TABLE "public"."100YR";

DROP TABLE "public"."10YR";

DROP TABLE "public"."15YR";

DROP TABLE "public"."20YR";

DROP TABLE "public"."25YR";

DROP TABLE "public"."2YR";

DROP TABLE "public"."50YR";

DROP TABLE "public"."5YR";

-- Hand-edited: components must be filled before reports and maintenance
-- get foreign keys to it.
INSERT INTO public.components (name, type, location)
SELECT name, 'inlets'::public.component_type, extensions.st_centroid(geom)::extensions.geography FROM public.inlets WHERE name IS NOT NULL
UNION ALL
SELECT name, 'outlets'::public.component_type, extensions.st_centroid(geom)::extensions.geography FROM public.outlets WHERE name IS NOT NULL
UNION ALL
SELECT name, 'storm_drains'::public.component_type, extensions.st_centroid(geom)::extensions.geography FROM public.storm_drains WHERE name IS NOT NULL
UNION ALL
SELECT name, 'man_pipes'::public.component_type, extensions.st_centroid(geom)::extensions.geography FROM public.man_pipes WHERE name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.nearest_components (
  p_type        public.component_type,
  p_lat         double precision,
  p_lon         double precision,
  p_radius_m    double precision      DEFAULT 50,
  p_max_results integer               DEFAULT 3
)
  RETURNS TABLE (
    name     text,
    lat      double precision,
    long     double precision,
    distance double precision
  )
  LANGUAGE sql
  STABLE
  SET search_path TO 'public', 'extensions'
  AS $function$
  select c.name,
         st_y(c.location::geometry),
         st_x(c.location::geometry),
         st_distance(c.location, q.point)
  from public.components c,
       (select st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography as point) q
  where c.type = p_type
    and st_dwithin(c.location, q.point, p_radius_m)
  order by c.location <-> q.point
  limit p_max_results
$function$;

ALTER TABLE "public"."maintenance"
  ADD CONSTRAINT "maintenance_component_name_fkey" FOREIGN KEY (component_name) REFERENCES public.components(name);

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_component_id_fkey" FOREIGN KEY (component_id) REFERENCES public.components(name);

CREATE VIEW "public"."component_locations" WITH (security_invoker=true) AS  SELECT name,
    type,
    extensions.st_y((location)::extensions.geometry) AS lat,
    extensions.st_x((location)::extensions.geometry) AS long
   FROM public.components;

CREATE INDEX idx_components_location ON public.components USING gist (location);

CREATE INDEX idx_components_type ON public.components USING btree (TYPE);

CREATE POLICY "Enable read access for all users" ON "public"."components"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."flood_results"
  FOR SELECT
  TO PUBLIC
  USING (true);

COMMENT ON COLUMN "public"."flood_results"."max_rate_cms" IS 'Peak flow, cubic metres per second.';

COMMENT ON COLUMN "public"."flood_results"."time_after_raining_min" IS 'Minutes of rain before the node overflows. 9999 in older exports means it never overflows (see normaliseOverflowMinutes).';

COMMENT ON COLUMN "public"."flood_results"."time_of_max" IS 'When the peak flow happens, as exported by the model. Its column was labelled "hr:min" but holds a whole number.';

COMMENT ON COLUMN "public"."flood_results"."total_flood_volume_megalitres" IS 'Total flood volume in millions of litres (the export''s "10^6 ltr").';

GRANT EXECUTE
  ON FUNCTION "public"."nearest_components"(public.component_type, double precision, double precision, double precision, integer)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON TABLE "public"."components" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."components" TO "anon";

REVOKE ALL ON TABLE "public"."components" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."components" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."components" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."flood_results" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."flood_results" TO "anon";

REVOKE ALL ON TABLE "public"."flood_results" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."flood_results" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."flood_results" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."component_locations" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."component_locations" TO "anon";

REVOKE ALL ON TABLE "public"."component_locations" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."component_locations" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."component_locations" TO "postgres", "service_role";
