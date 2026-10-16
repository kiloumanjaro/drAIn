SET local check_function_bodies = off;

REVOKE ALL ON TABLE "public"."maintenance_reviews" FROM "authenticated";

CREATE OR REPLACE FUNCTION public.my_resolution_verdicts()
  RETURNS TABLE (
    report_id uuid,
    verdict   public.review_verdict
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select r.report_id, r.verdict from public.maintenance_reviews r
  where r.reviewer_id = (select auth.uid()) and r.report_id is not null
$function$;

REVOKE ALL ON FUNCTION "public"."my_resolution_verdicts"() FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."my_resolution_verdicts"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."my_resolution_verdicts"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."my_resolution_verdicts"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."my_resolution_verdicts"() TO "service_role";

REVOKE ALL ("created_at") ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT SELECT ("created_at") ON TABLE "public"."maintenance_reviews" TO "authenticated";

REVOKE ALL ("evidence_image") ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT SELECT ("evidence_image") ON TABLE "public"."maintenance_reviews" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT SELECT ("id") ON TABLE "public"."maintenance_reviews" TO "authenticated";

REVOKE ALL ("maintenance_id") ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT SELECT ("maintenance_id") ON TABLE "public"."maintenance_reviews" TO "authenticated";

REVOKE ALL ("note") ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT SELECT ("note") ON TABLE "public"."maintenance_reviews" TO "authenticated";

REVOKE ALL ("report_id") ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT SELECT ("report_id") ON TABLE "public"."maintenance_reviews" TO "authenticated";

REVOKE ALL ("reviewer_kind") ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT SELECT ("reviewer_kind") ON TABLE "public"."maintenance_reviews" TO "authenticated";

REVOKE ALL ("verdict") ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT SELECT ("verdict") ON TABLE "public"."maintenance_reviews" TO "authenticated";
