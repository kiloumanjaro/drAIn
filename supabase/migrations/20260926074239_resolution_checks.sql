SET local check_function_bodies = off;

DROP VIEW "public"."team_performance";

DROP FUNCTION "public"."dashboard_overview"(timestamp WITH time zone);

DROP FUNCTION "public"."maintenance_history"(text);

CREATE TABLE "public"."maintenance_reviews" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "maintenance_id" uuid                     NOT NULL,
  "reviewer_id"    uuid,
  "reviewer_kind"  text                     NOT NULL,
  "report_id"      uuid,
  "note"           text,
  "evidence_image" text,
  CONSTRAINT "maintenance_reviews_one_per_reviewer" UNIQUE (maintenance_id, reviewer_id),
  CONSTRAINT "maintenance_reviews_pkey" PRIMARY KEY (id),
  CONSTRAINT "maintenance_reviews_reviewer_kind_check" CHECK ((reviewer_kind = ANY (ARRAY['staff'::text, 'reporter'::text])))
);

ALTER TABLE "public"."maintenance_reviews"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."maintenance_reviews" FROM "anon";

CREATE TYPE "public"."review_verdict" AS ENUM (
  'confirmed',
  'disputed'
);

ALTER TABLE "public"."maintenance_reviews"
  ADD COLUMN "verdict" public.review_verdict NOT NULL;

CREATE TYPE "public"."verification_status" AS ENUM (
  'unverified',
  'verified',
  'disputed'
);

ALTER TABLE "public"."maintenance"
  ADD COLUMN "verification_status" public.verification_status NOT NULL DEFAULT 'unverified'::public.verification_status;

CREATE OR REPLACE FUNCTION private.refresh_verification (
  p_maintenance_id uuid
)
  RETURNS void
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  update public.maintenance m
  set verification_status = case
    when exists (select 1 from public.maintenance_reviews r
                 where r.maintenance_id = m.id and r.verdict = 'disputed') then 'disputed'
    when exists (select 1 from public.maintenance_reviews r
                 where r.maintenance_id = m.id and r.verdict = 'confirmed') then 'verified'
    else 'unverified'
  end::public.verification_status
  where m.id = p_maintenance_id
$function$;

CREATE OR REPLACE FUNCTION private.reopen_resolved_reports (
  p_maintenance_id uuid,
  p_reporter       uuid DEFAULT NULL::uuid
)
  RETURNS void
  LANGUAGE sql
  SET search_path TO ''
  AS $function$
  update public.reports
  set status = 'pending',
      resolved_at = null,
      resolved_image = null,
      resolved_by_maintenance_id = null
  where resolved_by_maintenance_id = p_maintenance_id
    and status = 'resolved'
    and (p_reporter is null or user_id = p_reporter)
$function$;

CREATE OR REPLACE FUNCTION public.dashboard_overview (
  p_month_start timestamp with time zone DEFAULT date_trunc('month'::text, now())
)
  RETURNS TABLE (
    fixed_this_month          integer,
    pending_issues            integer,
    average_repair_days       numeric,
    total_staff               integer,
    verified_fixed_this_month integer,
    awaiting_verification     integer
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.maintenance_history (
  p_component_name text
)
  RETURNS TABLE (
    id                  uuid,
    performed_at        timestamp with time zone,
    agency_name         text,
    performed_by_name   text,
    status              public.maintenance_status,
    description         text,
    evidence_image      text,
    verification_status public.verification_status,
    can_review          boolean,
    my_verdict          public.review_verdict,
    latest_dispute      text
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
$function$;

REVOKE ALL ON FUNCTION "public"."maintenance_history"(text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.respond_to_resolution (
  p_report_id uuid,
  p_verdict   public.review_verdict,
  p_note      text                  DEFAULT NULL::text
)
  RETURNS public.reports
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  note text := nullif(btrim(p_note), '');
  report public.reports;
  work public.maintenance;
BEGIN
  SELECT * INTO report FROM public.reports WHERE id = p_report_id;
  IF auth.uid() IS NULL OR report.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Only the person who filed this report can say whether it was fixed.'
      USING ERRCODE = '42501';
  END IF;
  IF report.status <> 'resolved' OR report.resolved_by_maintenance_id IS NULL THEN
    RAISE EXCEPTION 'This report has not been marked fixed.' USING ERRCODE = 'P0001';
  END IF;
  IF report.resolved_at < now() - interval '30 days' THEN
    RAISE EXCEPTION 'This was marked fixed more than 30 days ago. File a new report instead.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO work FROM public.maintenance WHERE id = report.resolved_by_maintenance_id;
  IF work.performed_by = auth.uid() THEN
    RAISE EXCEPTION 'Someone other than the person who did the work has to check it.'
      USING ERRCODE = '42501';
  END IF;
  IF p_verdict = 'disputed' AND note IS NULL THEN
    RAISE EXCEPTION 'Say what is still wrong.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.maintenance_reviews
    (maintenance_id, reviewer_id, reviewer_kind, report_id, verdict, note)
  VALUES (work.id, auth.uid(), 'reporter', report.id, p_verdict, note)
  ON CONFLICT (maintenance_id, reviewer_id) DO UPDATE
    SET verdict = excluded.verdict, note = excluded.note,
        report_id = excluded.report_id, created_at = now();

  IF p_verdict = 'disputed' THEN
    PERFORM private.reopen_resolved_reports(work.id, auth.uid());
  END IF;
  PERFORM private.refresh_verification(work.id);

  SELECT * INTO report FROM public.reports WHERE id = p_report_id;
  RETURN report;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."respond_to_resolution"(uuid, public.review_verdict, text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.review_maintenance (
  p_maintenance_id uuid,
  p_verdict        public.review_verdict,
  p_note           text                  DEFAULT NULL::text,
  p_evidence_image text                  DEFAULT NULL::text
)
  RETURNS public.maintenance
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  note text := nullif(btrim(p_note), '');
  work public.maintenance;
BEGIN
  IF private.current_agency_id() IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can check maintenance.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO work FROM public.maintenance WHERE id = p_maintenance_id;
  IF work.id IS NULL THEN
    RAISE EXCEPTION 'No such maintenance record.' USING ERRCODE = 'P0002';
  END IF;
  IF work.status <> 'resolved' THEN
    RAISE EXCEPTION 'Only finished work can be checked.' USING ERRCODE = 'P0001';
  END IF;
  IF work.performed_by = auth.uid() THEN
    RAISE EXCEPTION 'Someone other than the person who did the work has to check it.'
      USING ERRCODE = '42501';
  END IF;
  IF p_verdict = 'disputed' AND note IS NULL THEN
    RAISE EXCEPTION 'Say what is still wrong.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.maintenance_reviews
    (maintenance_id, reviewer_id, reviewer_kind, verdict, note, evidence_image)
  VALUES (work.id, auth.uid(), 'staff', p_verdict, note, p_evidence_image)
  ON CONFLICT (maintenance_id, reviewer_id) DO UPDATE
    SET verdict = excluded.verdict, note = excluded.note,
        evidence_image = excluded.evidence_image, created_at = now();

  IF p_verdict = 'disputed' THEN
    PERFORM private.reopen_resolved_reports(work.id);
  END IF;
  PERFORM private.refresh_verification(work.id);

  SELECT * INTO work FROM public.maintenance WHERE id = p_maintenance_id;
  RETURN work;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."review_maintenance"(uuid, public.review_verdict, text, text) FROM PUBLIC, "anon";

ALTER TABLE "public"."maintenance_reviews"
  ADD CONSTRAINT "maintenance_reviews_maintenance_id_fkey" FOREIGN KEY (maintenance_id) REFERENCES public.maintenance(id) ON DELETE CASCADE;

ALTER TABLE "public"."maintenance_reviews"
  ADD CONSTRAINT "maintenance_reviews_report_id_fkey" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE SET NULL;

ALTER TABLE "public"."maintenance_reviews"
  ADD CONSTRAINT "maintenance_reviews_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE VIEW "public"."team_performance" WITH (security_invoker=true) AS  SELECT a.name AS agency_name,
    (count(r.id))::integer AS total_issues,
    (count(r.id) FILTER (WHERE (r.status = 'resolved'::public.report_status)))::integer AS resolved_issues,
    (count(r.id) FILTER (WHERE (r.status <> 'resolved'::public.report_status)))::integer AS outstanding_issues,
    round((percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((d.repair_days)::double precision)))::numeric, 1) AS median_days_to_resolve,
    (count(r.id) FILTER (WHERE ((r.status = 'resolved'::public.report_status) AND (m.verification_status = 'verified'::public.verification_status))))::integer AS verified_issues
   FROM (((public.agencies a
     JOIN public.maintenance m ON ((m.agency_id = a.id)))
     JOIN public.reports r ON (((r.resolved_by_maintenance_id = m.id) AND (r.review_status <> 'rejected'::public.report_review))))
     LEFT JOIN public.report_repair_days d ON ((d.id = r.id)))
  GROUP BY a.id, a.name;

CREATE INDEX idx_maintenance_reviews_report_id ON public.maintenance_reviews USING btree (report_id);

CREATE INDEX idx_maintenance_reviews_reviewer_id ON public.maintenance_reviews USING btree (reviewer_id);

CREATE POLICY "Staff and the reviewer can read reviews" ON "public"."maintenance_reviews"
  FOR SELECT
  TO "authenticated"
  USING (((( SELECT private.current_agency_id() AS current_agency_id) IS NOT NULL) OR (reviewer_id = ( SELECT auth.uid() AS uid))));

COMMENT ON COLUMN "public"."maintenance"."verification_status" IS 'Kept by review_maintenance and respond_to_resolution from maintenance_reviews: disputed if anyone disputed it, verified if someone other than the person who did it confirmed it, else unverified.';

COMMENT ON COLUMN "public"."maintenance_reviews"."report_id" IS 'For a reporter''s review, the report they answered for.';

COMMENT ON COLUMN "public"."maintenance_reviews"."reviewer_kind" IS 'staff: another agency member checked the work. reporter: the citizen whose report it closed.';

GRANT EXECUTE ON FUNCTION "private"."refresh_verification"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."reopen_resolved_reports"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."dashboard_overview"(timestamp WITH time zone) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."maintenance_history"(text) TO "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."respond_to_resolution"(uuid, public.review_verdict, text) TO "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."review_maintenance"(uuid, public.review_verdict, text, text) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON TABLE "public"."maintenance_reviews" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."maintenance_reviews" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."maintenance_reviews" TO "postgres", "service_role";

GRANT USAGE ON TYPE "public"."review_verdict" TO "postgres";

GRANT USAGE ON TYPE "public"."verification_status" TO "postgres";

REVOKE ALL ON TABLE "public"."team_performance" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."team_performance" TO "anon";

REVOKE ALL ON TABLE "public"."team_performance" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."team_performance" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."team_performance" TO "postgres", "service_role";
