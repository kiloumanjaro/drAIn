SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.dashboard_overview (
  p_month_start timestamp with time zone DEFAULT date_trunc('month'::text, now())
)
  RETURNS TABLE (
    fixed_this_month    integer,
    pending_issues      integer,
    average_repair_days numeric,
    total_staff         integer
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select
    (select count(*) from public.reports
      where status = 'resolved' and resolved_at >= p_month_start)::integer,
    (select count(*) from public.reports where status = 'pending')::integer,
    (select coalesce(round(avg(repair_days), 1), 0) from public.report_repair_days),
    (select count(*) from public.profiles where role in ('staff', 'admin'))::integer
$function$;

CREATE OR REPLACE FUNCTION public.maintenance_history (
  p_component_name text
)
  RETURNS TABLE (
    performed_at      timestamp with time zone,
    agency_name       text,
    performed_by_name text,
    status            public.maintenance_status,
    description       text,
    evidence_image    text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  IF private.current_agency_id() IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can see maintenance history.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT m.performed_at, a.name, p.full_name, m.status, m.description, m.evidence_image
  FROM public.maintenance m
  JOIN public.agencies a ON a.id = m.agency_id
  LEFT JOIN public.profiles p ON p.id = m.performed_by
  WHERE m.component_name = p_component_name
  ORDER BY m.performed_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."maintenance_history"(text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.repair_trend (
  p_days integer DEFAULT 30
)
  RETURNS TABLE (
    day          date,
    average_days numeric
  )
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select (d.created_at at time zone 'UTC')::date, round(avg(d.repair_days), 1)
  from public.report_repair_days d
  where d.created_at >= now() - make_interval(days => p_days)
  group by 1
  order by 1
$function$;

CREATE VIEW "public"."latest_report_per_component" WITH (security_invoker=true) AS  SELECT DISTINCT ON (component_id) id,
    created_at,
    category,
    description,
    image,
    reporter_name,
    status,
    component_id,
    long,
    lat,
    geocoded_status,
    address,
    user_id,
    priority,
    zone,
    resolved_at,
    resolved_by_maintenance_id,
    resolved_image
   FROM public.reports
  WHERE (component_id IS NOT NULL)
  ORDER BY component_id, created_at DESC;

CREATE VIEW "public"."report_counts_by_category" WITH (security_invoker=true) AS  SELECT category,
    (count(*))::integer AS report_count
   FROM public.reports
  WHERE (category IS NOT NULL)
  GROUP BY category;

CREATE VIEW "public"."report_counts_by_component" WITH (security_invoker=true) AS  SELECT category,
    component_id,
    (count(*))::integer AS report_count
   FROM public.reports
  WHERE (component_id IS NOT NULL)
  GROUP BY category, component_id;

CREATE VIEW "public"."report_counts_by_zone" WITH (security_invoker=true) AS  SELECT zone,
    (count(*))::integer AS report_count
   FROM public.reports
  WHERE (zone IS NOT NULL)
  GROUP BY zone;

CREATE VIEW "public"."report_repair_days" WITH (security_invoker=true) AS  SELECT id,
    category,
    component_id,
    created_at,
    resolved_at,
    (EXTRACT(epoch FROM (resolved_at - created_at)) / 86400.0) AS repair_days
   FROM public.reports
  WHERE ((status = 'resolved'::public.report_status) AND (resolved_at IS NOT NULL) AND (resolved_at >= created_at));

CREATE VIEW "public"."repair_time_by_component" WITH (security_invoker=true) AS  SELECT category AS component_type,
    round(avg(repair_days), 1) AS average_days,
    (count(*))::integer AS resolved_count
   FROM public.report_repair_days
  WHERE (category IS NOT NULL)
  GROUP BY category;

CREATE VIEW "public"."team_performance" WITH (security_invoker=true) AS  SELECT a.name AS agency_name,
    (count(r.id))::integer AS total_issues,
    (count(r.id) FILTER (WHERE (r.status = 'resolved'::public.report_status)))::integer AS resolved_issues,
    (count(r.id) FILTER (WHERE (r.status <> 'resolved'::public.report_status)))::integer AS outstanding_issues,
    round((percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((d.repair_days)::double precision)))::numeric, 1) AS median_days_to_resolve
   FROM (((public.agencies a
     JOIN public.maintenance m ON ((m.agency_id = a.id)))
     JOIN public.reports r ON ((r.resolved_by_maintenance_id = m.id)))
     LEFT JOIN public.report_repair_days d ON ((d.id = r.id)))
  GROUP BY a.id, a.name;

GRANT EXECUTE ON FUNCTION "public"."dashboard_overview"(timestamp WITH time zone) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."maintenance_history"(text) TO "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."repair_trend"(integer) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."latest_report_per_component" TO "anon";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."latest_report_per_component" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."latest_report_per_component" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."repair_time_by_component" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."repair_time_by_component" TO "anon";

REVOKE ALL ON TABLE "public"."repair_time_by_component" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."repair_time_by_component" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."repair_time_by_component" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."report_counts_by_category" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_category" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_category" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_category" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_counts_by_category" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."report_counts_by_component" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_component" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_component" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_component" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_counts_by_component" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."report_counts_by_zone" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_zone" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_zone" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_counts_by_zone" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_counts_by_zone" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."report_repair_days" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_repair_days" TO "anon";

REVOKE ALL ON TABLE "public"."report_repair_days" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."report_repair_days" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_repair_days" TO "postgres", "service_role";

REVOKE ALL ON TABLE "public"."team_performance" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."team_performance" TO "anon";

REVOKE ALL ON TABLE "public"."team_performance" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."team_performance" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_performance" TO "postgres", "service_role";
