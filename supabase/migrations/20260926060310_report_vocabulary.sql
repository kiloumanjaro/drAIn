SET local check_function_bodies = off;

DROP POLICY "Public insert reports" ON "public"."reports";

DROP INDEX "public"."idx_report_category";

ALTER TABLE "public"."reports"
  DROP CONSTRAINT "reports_priority_check";

DROP TYPE "public"."asset_point_type";

DROP TYPE "public"."drainage_status";

DROP TYPE "public"."maintenance_type";

ALTER TABLE "public"."reports"
  ALTER COLUMN "category" DROP DEFAULT;

ALTER TABLE "public"."reports"
  ALTER COLUMN "category" TYPE public.component_type USING "category"::public.component_type;

-- Hand-edited: older rows may have no priority; they were treated as low.
UPDATE public.reports SET priority = 'low' WHERE priority IS NULL;

ALTER TABLE "public"."reports"
  ALTER COLUMN "priority" SET NOT NULL;

ALTER TABLE "public"."reports"
  ALTER COLUMN "priority" DROP DEFAULT;

-- Hand-edited: declarative sync emitted SET DEFAULT 'low'::report_priority
-- here, before CREATE TYPE. Removed; it is repeated after the type change.

CREATE TYPE "public"."report_priority" AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

ALTER TABLE "public"."reports"
  ALTER COLUMN "priority" TYPE public.report_priority USING "priority"::public.report_priority;

ALTER TABLE "public"."reports"
  ALTER COLUMN "priority" SET DEFAULT 'low'::public.report_priority;

ALTER TYPE "public"."report_status" RENAME TO "report_status__pgdelta_replaced";

CREATE TYPE "public"."report_status" AS ENUM (
  'pending',
  'in-progress',
  'resolved'
);

ALTER TABLE "public"."reports"
  ALTER COLUMN "status" TYPE "public"."report_status" USING "status"::text::"public"."report_status";

DROP TYPE "public"."report_status__pgdelta_replaced";

ALTER TABLE "public"."reports"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "public"."reports"
  ALTER COLUMN "status" TYPE public.report_status USING "status"::public.report_status;

ALTER TABLE "public"."reports"
  ALTER COLUMN "status" SET DEFAULT 'pending'::public.report_status;

ALTER TABLE "public"."reports"
  ALTER COLUMN "status" SET DEFAULT 'pending'::public.report_status;

CREATE OR REPLACE FUNCTION public.record_maintenance (
  p_component_type public.component_type,
  p_component_name text,
  p_status         public.maintenance_status,
  p_description    text                      DEFAULT NULL::text,
  p_evidence_image text                      DEFAULT NULL::text
)
  RETURNS public.maintenance
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  staff_agency uuid := private.current_agency_id();
  result public.maintenance;
BEGIN
  IF staff_agency IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can record maintenance.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.maintenance
    (component_type, component_name, agency_id, performed_by, status, description, evidence_image)
  VALUES
    (p_component_type, p_component_name, staff_agency, auth.uid(), p_status,
     nullif(btrim(p_description), ''), p_evidence_image)
  RETURNING * INTO result;

  UPDATE public.reports
  SET status = p_status::text::public.report_status,
      resolved_by_maintenance_id = result.id,
      resolved_image = coalesce(p_evidence_image, resolved_image),
      resolved_at = CASE WHEN p_status = 'resolved' THEN result.performed_at ELSE resolved_at END
  WHERE component_id = p_component_name
    AND created_at <= result.performed_at
    AND status = ANY (CASE WHEN p_status = 'resolved'
                           THEN ARRAY['pending', 'in-progress']::public.report_status[]
                           ELSE ARRAY['pending']::public.report_status[] END);

  RETURN result;
END;
$function$;

CREATE POLICY "Public insert reports" ON "public"."reports"
  FOR INSERT
  TO PUBLIC
  WITH
    CHECK
    (((status = 'pending'::public.report_status) AND (NOT (user_id IS DISTINCT FROM ( SELECT auth.uid() AS uid))) AND (resolved_by_maintenance_id IS NULL) AND (resolved_image IS
    NULL)));

COMMENT ON COLUMN "public"."reports"."priority" IS 'Set by the reporter when filing.';

GRANT USAGE ON TYPE "public"."report_priority" TO "postgres";
