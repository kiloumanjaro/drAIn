-- Dashboard and map read models (checklist step 6).
--
-- Everything the dashboard shows is counted here, in the database. The app
-- used to download report rows and count them in the browser, which quietly
-- stopped at the API's 1,000-row limit (max_rows in config.toml).
--
-- Reports staff rejected (review_report in schema_trust.sql) are left out of
-- every figure here: they are spam, duplicates or not a drainage problem.
--
-- Views run with the caller's rights (security_invoker), so they show exactly
-- what the caller could read from reports. The two functions that must see
-- across users are SECURITY DEFINER and check or limit what they return.
--
-- Loaded after schema.sql and schema_auth_storage.sql (file names sort that
-- way); everything here builds on public.reports and public.maintenance.


-- The newest report on each component: what the map pins show. Only the
-- columns signed-out visitors may read (see the reports grants in
-- schema.sql), so the map works the same signed in or out.
CREATE OR REPLACE VIEW "public"."latest_report_per_component" WITH ("security_invoker"='true') AS
 SELECT DISTINCT ON ("reports"."component_id") "reports"."id",
    "reports"."created_at",
    "reports"."category",
    "reports"."description",
    "reports"."image",
    "reports"."reporter_name",
    "reports"."status",
    "reports"."component_id",
    "reports"."long",
    "reports"."lat",
    "reports"."geocoded_status",
    "reports"."address",
    "reports"."priority",
    "reports"."zone",
    "reports"."resolved_by_maintenance_id",
    "reports"."resolved_image",
    "reports"."resolved_at",
    "reports"."reviewed_at",
    "reports"."review_note",
    "reports"."photo_check",
    "reports"."review_status"
   FROM "public"."reports"
  WHERE (("reports"."component_id" IS NOT NULL) AND ("reports"."review_status" <> 'rejected'::"public"."report_review"))
  ORDER BY "reports"."component_id", "reports"."created_at" DESC;


ALTER VIEW "public"."latest_report_per_component" OWNER TO "postgres";


-- How many reports each component has (the number on a map pin).
CREATE OR REPLACE VIEW "public"."report_counts_by_component" WITH ("security_invoker"='true') AS
 SELECT "reports"."category",
    "reports"."component_id",
    ("count"(*))::integer AS "report_count"
   FROM "public"."reports"
  WHERE (("reports"."component_id" IS NOT NULL) AND ("reports"."review_status" <> 'rejected'::"public"."report_review"))
  GROUP BY "reports"."category", "reports"."component_id";


ALTER VIEW "public"."report_counts_by_component" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."report_counts_by_zone" WITH ("security_invoker"='true') AS
 SELECT "reports"."zone",
    ("count"(*))::integer AS "report_count"
   FROM "public"."reports"
  WHERE (("reports"."zone" IS NOT NULL) AND ("reports"."review_status" <> 'rejected'::"public"."report_review"))
  GROUP BY "reports"."zone";


ALTER VIEW "public"."report_counts_by_zone" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."report_counts_by_category" WITH ("security_invoker"='true') AS
 SELECT "reports"."category",
    ("count"(*))::integer AS "report_count"
   FROM "public"."reports"
  WHERE (("reports"."category" IS NOT NULL) AND ("reports"."review_status" <> 'rejected'::"public"."report_review"))
  GROUP BY "reports"."category";


ALTER VIEW "public"."report_counts_by_category" OWNER TO "postgres";


-- Reports filed per day (UTC): the chart on the map's reports toggle.
CREATE OR REPLACE VIEW "public"."report_counts_by_day" WITH ("security_invoker"='true') AS
 SELECT (("reports"."created_at" AT TIME ZONE 'UTC'::"text"))::"date" AS "day",
    ("count"(*))::integer AS "report_count"
   FROM "public"."reports"
  WHERE ("reports"."review_status" <> 'rejected'::"public"."report_review")
  GROUP BY ((("reports"."created_at" AT TIME ZONE 'UTC'::"text"))::"date");


ALTER VIEW "public"."report_counts_by_day" OWNER TO "postgres";


-- The one definition of repair time: days from a report to the maintenance
-- that resolved it (resolved_at, set by record_maintenance). Work dated
-- before its report is a wrong link, not a fast fix, and is left out.
CREATE OR REPLACE VIEW "public"."report_repair_days" WITH ("security_invoker"='true') AS
 SELECT "reports"."id",
    "reports"."category",
    "reports"."component_id",
    "reports"."created_at",
    "reports"."resolved_at",
    (EXTRACT(epoch FROM ("reports"."resolved_at" - "reports"."created_at")) / 86400.0) AS "repair_days"
   FROM "public"."reports"
  WHERE (("reports"."status" = 'resolved'::"public"."report_status") AND ("reports"."resolved_at" IS NOT NULL) AND ("reports"."resolved_at" >= "reports"."created_at") AND ("reports"."review_status" <> 'rejected'::"public"."report_review"));


ALTER VIEW "public"."report_repair_days" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."repair_time_by_component" WITH ("security_invoker"='true') AS
 SELECT "report_repair_days"."category" AS "component_type",
    "round"("avg"("report_repair_days"."repair_days"), 1) AS "average_days",
    ("count"(*))::integer AS "resolved_count"
   FROM "public"."report_repair_days"
  WHERE ("report_repair_days"."category" IS NOT NULL)
  GROUP BY "report_repair_days"."category";


ALTER VIEW "public"."repair_time_by_component" OWNER TO "postgres";


-- Per agency: the reports its maintenance has moved along (the maintenance
-- that last touched a report decides which agency it belongs to), how many
-- are resolved, and the median days to resolve. Reports nobody has worked on
-- belong to no agency yet and aren't counted here. verified_issues: resolved
-- reports whose fix someone other than the crew has confirmed.
CREATE OR REPLACE VIEW "public"."team_performance" WITH ("security_invoker"='true') AS
 SELECT "a"."name" AS "agency_name",
    ("count"("r"."id"))::integer AS "total_issues",
    ("count"("r"."id") FILTER (WHERE ("r"."status" = 'resolved'::"public"."report_status")))::integer AS "resolved_issues",
    ("count"("r"."id") FILTER (WHERE ("r"."status" <> 'resolved'::"public"."report_status")))::integer AS "outstanding_issues",
    "round"((percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY (("d"."repair_days")::double precision)))::numeric, 1) AS "median_days_to_resolve",
    ("count"("r"."id") FILTER (WHERE (("r"."status" = 'resolved'::"public"."report_status") AND ("m"."verification_status" = 'verified'::"public"."verification_status"))))::integer AS "verified_issues"
   FROM ((("public"."agencies" "a"
     JOIN "public"."maintenance" "m" ON (("m"."agency_id" = "a"."id")))
     JOIN "public"."reports" "r" ON ((("r"."resolved_by_maintenance_id" = "m"."id") AND ("r"."review_status" <> 'rejected'::"public"."report_review"))))
     LEFT JOIN "public"."report_repair_days" "d" ON (("d"."id" = "r"."id")))
  GROUP BY "a"."id", "a"."name";


ALTER VIEW "public"."team_performance" OWNER TO "postgres";


-- Average repair days per report day (UTC), for the trend chart.
CREATE OR REPLACE FUNCTION "public"."repair_trend"("p_days" integer DEFAULT 30) RETURNS TABLE("day" "date", "average_days" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select (d.created_at at time zone 'UTC')::date, round(avg(d.repair_days), 1)
  from public.report_repair_days d
  where d.created_at >= now() - make_interval(days => p_days)
  group by 1
  order by 1
$$;


ALTER FUNCTION "public"."repair_trend"("p_days" integer) OWNER TO "postgres";


-- The dashboard's headline numbers. SECURITY DEFINER only so it can count
-- staff, whose profiles other users can't read; it returns counts, never
-- rows. p_month_start is the caller's local start of the month.
-- verified_fixed_this_month: of the fixes, those someone other than the
-- crew has confirmed. awaiting_verification: finished work nobody has
-- checked yet.
CREATE OR REPLACE FUNCTION "public"."dashboard_overview"("p_month_start" timestamp with time zone DEFAULT "date_trunc"('month'::"text", "now"())) RETURNS TABLE("fixed_this_month" integer, "pending_issues" integer, "average_repair_days" numeric, "total_staff" integer, "verified_fixed_this_month" integer, "awaiting_verification" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    (select count(*) from public.reports
      where status = 'resolved' and resolved_at >= p_month_start
        and review_status <> 'rejected')::integer,
    (select count(*) from public.reports
      where status = 'pending' and review_status <> 'rejected')::integer,
    (select coalesce(round(avg(repair_days), 1), 0) from public.report_repair_days),
    (select count(*) from public.profiles where role in ('staff', 'admin'))::integer,
    (select count(*) from public.reports r
      join public.maintenance m on m.id = r.resolved_by_maintenance_id
      where r.status = 'resolved' and r.resolved_at >= p_month_start
        and r.review_status <> 'rejected' and m.verification_status = 'verified')::integer,
    (select count(*) from public.maintenance
      where status = 'resolved' and verification_status = 'unverified')::integer
$$;


ALTER FUNCTION "public"."dashboard_overview"("p_month_start" timestamp with time zone) OWNER TO "postgres";


-- A component's maintenance, newest first, naming who did it. Staff only:
-- it reads staff names, which other users can't see in profiles.
-- can_review: finished work the caller didn't do, so they may check it.
-- my_verdict: the caller's own check, if any. latest_dispute: why the most
-- recent dispute says it isn't fixed.
CREATE OR REPLACE FUNCTION "public"."maintenance_history"("p_component_name" "text") RETURNS TABLE("id" "uuid", "performed_at" timestamp with time zone, "agency_name" "text", "performed_by_name" "text", "status" "public"."maintenance_status", "description" "text", "evidence_image" "text", "verification_status" "public"."verification_status", "can_review" boolean, "my_verdict" "public"."review_verdict", "latest_dispute" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF private.current_agency_id() IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can see maintenance history.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.id, m.performed_at, a.name, p.full_name, m.status, m.description, m.evidence_image,
         m.verification_status,
         m.status = 'resolved' AND m.performed_by IS DISTINCT FROM auth.uid(),
         (SELECT r.verdict FROM public.maintenance_reviews r
          WHERE r.maintenance_id = m.id AND r.reviewer_id = auth.uid()),
         (SELECT r.note FROM public.maintenance_reviews r
          WHERE r.maintenance_id = m.id AND r.verdict = 'disputed'
          ORDER BY r.created_at DESC LIMIT 1)
  FROM public.maintenance m
  JOIN public.agencies a ON a.id = m.agency_id
  LEFT JOIN public.profiles p ON p.id = m.performed_by
  WHERE m.component_name = p_component_name
  ORDER BY m.performed_at DESC;
END;
$$;


ALTER FUNCTION "public"."maintenance_history"("p_component_name" "text") OWNER TO "postgres";


REVOKE ALL ON FUNCTION "public"."maintenance_history"("p_component_name" "text") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."maintenance_history"("p_component_name" "text") TO "authenticated", "service_role";


-- Read models are read-only. New objects get no client privileges by
-- default (see the end of schema.sql), so each is granted here.
GRANT EXECUTE ON FUNCTION "public"."repair_trend"("p_days" integer) TO "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."dashboard_overview"("p_month_start" timestamp with time zone) TO "anon", "authenticated";
GRANT SELECT ON TABLE "public"."latest_report_per_component" TO "anon", "authenticated";
GRANT SELECT ON TABLE "public"."report_counts_by_component" TO "anon", "authenticated";
GRANT SELECT ON TABLE "public"."report_counts_by_zone" TO "anon", "authenticated";
GRANT SELECT ON TABLE "public"."report_counts_by_category" TO "anon", "authenticated";
GRANT SELECT ON TABLE "public"."report_counts_by_day" TO "anon", "authenticated";
GRANT SELECT ON TABLE "public"."report_repair_days" TO "anon", "authenticated";
GRANT SELECT ON TABLE "public"."repair_time_by_component" TO "anon", "authenticated";
GRANT SELECT ON TABLE "public"."team_performance" TO "anon", "authenticated";
