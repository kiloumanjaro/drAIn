-- Hand-edited: the table-level revoke on reports moved up here. Revoking a
-- table privilege also revokes the matching column privileges, so after
-- the column grants below it would have left anon unable to read reports.
REVOKE ALL ON TABLE "public"."maintenance" FROM "anon";

REVOKE ALL ON TABLE "public"."reports" FROM "anon";

GRANT INSERT ON TABLE "public"."reports" TO "anon";

DROP VIEW "public"."latest_report_per_component";

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
    priority,
    zone,
    resolved_by_maintenance_id,
    resolved_image,
    resolved_at,
    photo_taken_at,
    photo_distance_m,
    reviewed_at,
    review_note,
    photo_check,
    review_status
   FROM public.reports
  WHERE ((component_id IS NOT NULL) AND (review_status <> 'rejected'::public.report_review))
  ORDER BY component_id, created_at DESC;

REVOKE ALL ("agency_id") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("agency_id") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("component_name") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("component_name") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("component_type") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("component_type") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("created_at") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("created_at") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("description") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("description") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("evidence_image") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("evidence_image") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("id") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("id") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("performed_at") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("performed_at") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("status") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("status") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("verification_status") ON TABLE "public"."maintenance" FROM "anon";

GRANT SELECT ("verification_status") ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ("address") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("address") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("category") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("category") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("component_id") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("component_id") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("created_at") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("created_at") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("description") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("description") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("geocoded_status") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("geocoded_status") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("id") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("id") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("image") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("image") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("lat") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("lat") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("long") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("long") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("photo_check") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("photo_check") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("photo_distance_m") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("photo_distance_m") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("photo_taken_at") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("photo_taken_at") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("priority") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("priority") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("reporter_name") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("reporter_name") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("resolved_at") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("resolved_at") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("resolved_by_maintenance_id") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("resolved_by_maintenance_id") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("resolved_image") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("resolved_image") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("review_note") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("review_note") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("review_status") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("review_status") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("reviewed_at") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("reviewed_at") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("status") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("status") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ("zone") ON TABLE "public"."reports" FROM "anon";

GRANT SELECT ("zone") ON TABLE "public"."reports" TO "anon";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "anon";

GRANT SELECT ON TABLE "public"."latest_report_per_component" TO "anon";

REVOKE ALL ON TABLE "public"."latest_report_per_component" FROM "authenticated";

GRANT SELECT ON TABLE "public"."latest_report_per_component" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."latest_report_per_component" TO "postgres", "service_role";
