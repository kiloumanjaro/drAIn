CREATE VIEW "public"."report_counts_by_day" WITH (security_invoker=true) AS  SELECT ((created_at AT TIME ZONE 'UTC'::text))::date AS day,
    (count(*))::integer AS report_count
   FROM public.reports
  WHERE (review_status <> 'rejected'::public.report_review)
  GROUP BY (((created_at AT TIME ZONE 'UTC'::text))::date);

REVOKE ALL ON TABLE "public"."report_counts_by_day" FROM "anon";

GRANT SELECT ON TABLE "public"."report_counts_by_day" TO "anon";

REVOKE ALL ON TABLE "public"."report_counts_by_day" FROM "authenticated";

GRANT SELECT ON TABLE "public"."report_counts_by_day" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."report_counts_by_day" TO "postgres", "service_role";
