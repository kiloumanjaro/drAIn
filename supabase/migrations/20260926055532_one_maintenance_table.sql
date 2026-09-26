SET local check_function_bodies = off;

DROP POLICY "Staff update reports" ON "public"."reports";

ALTER TABLE "public"."inlets_maintenance"
  DROP CONSTRAINT "inlets_maintenance_addressed_report_id_fkey";

ALTER TABLE "public"."inlets_maintenance"
  DROP CONSTRAINT "inlets_maintenance_agency_id_fkey";

ALTER TABLE "public"."inlets_maintenance"
  DROP CONSTRAINT "inlets_maintenance_represented_by_fkey";

ALTER TABLE "public"."man_pipes_maintenance"
  DROP CONSTRAINT "man_pipes_maintenance_addressed_report_id_fkey";

ALTER TABLE "public"."man_pipes_maintenance"
  DROP CONSTRAINT "man_pipes_maintenance_agency_id_fkey";

ALTER TABLE "public"."man_pipes_maintenance"
  DROP CONSTRAINT "man_pipes_maintenance_represented_by_fkey";

ALTER TABLE "public"."outlets_maintenance"
  DROP CONSTRAINT "outlets_maintenance_addressed_report_id_fkey";

ALTER TABLE "public"."outlets_maintenance"
  DROP CONSTRAINT "outlets_maintenance_agency_id_fkey";

ALTER TABLE "public"."outlets_maintenance"
  DROP CONSTRAINT "outlets_maintenance_represented_by_fkey";

ALTER TABLE "public"."storm_drains_maintenance"
  DROP CONSTRAINT "storm_drains_maintenance_addressed_report_id_fkey";

ALTER TABLE "public"."storm_drains_maintenance"
  DROP CONSTRAINT "storm_drains_maintenance_agency_id_fkey";

ALTER TABLE "public"."storm_drains_maintenance"
  DROP CONSTRAINT "storm_drains_maintenance_represented_by_fkey";

-- Hand-edited: the drops of the old tables and of
-- reports.resolved_by_maintenance_type moved below, after their rows are
-- copied into public.maintenance.

CREATE TABLE "public"."maintenance" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "performed_at"   timestamp with time zone NOT NULL DEFAULT now(),
  "component_name" text                     NOT NULL,
  "agency_id"      uuid                     NOT NULL,
  "performed_by"   uuid,
  "description"    text,
  "evidence_image" text,
  CONSTRAINT "maintenance_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."maintenance"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."reports"
  ADD COLUMN "resolved_at" timestamp WITH time zone;

CREATE TYPE "public"."component_type" AS ENUM (
  'inlets',
  'outlets',
  'storm_drains',
  'man_pipes'
);

ALTER TABLE "public"."maintenance"
  ADD COLUMN "component_type" public.component_type NOT NULL;

CREATE TYPE "public"."maintenance_status" AS ENUM (
  'in-progress',
  'resolved'
);

ALTER TABLE "public"."maintenance"
  ADD COLUMN "status" public.maintenance_status NOT NULL;

-- Hand-edited: carry existing rows over before the old tables go
-- (declarative sync writes DDL only). On a fresh database the old tables
-- are empty and this does nothing. Ids are kept, so the links in
-- reports.resolved_by_maintenance_id stay valid. A missing status (older
-- rows) counts as resolved, and the old 'No Comments' default is dropped.
INSERT INTO public.maintenance
  (id, created_at, performed_at, component_type, component_name, agency_id,
   performed_by, status, description, evidence_image)
SELECT id, created_at, last_cleaned_at, 'inlets'::public.component_type, in_name, agency_id, represented_by,
       coalesce(status, 'resolved')::public.maintenance_status,
       nullif(description, 'No Comments'), evidence_image
FROM public.inlets_maintenance
UNION ALL
SELECT id, created_at, last_cleaned_at, 'outlets'::public.component_type, out_name, agency_id, represented_by,
       coalesce(status, 'resolved')::public.maintenance_status,
       nullif(description, 'No Comments'), evidence_image
FROM public.outlets_maintenance
UNION ALL
SELECT id, created_at, last_cleaned_at, 'storm_drains'::public.component_type, in_name, agency_id, represented_by,
       coalesce(status, 'resolved')::public.maintenance_status,
       nullif(description, 'No Comments'), evidence_image
FROM public.storm_drains_maintenance
UNION ALL
SELECT id, created_at, last_cleaned_at, 'man_pipes'::public.component_type, name, agency_id, represented_by,
       coalesce(status, 'resolved')::public.maintenance_status,
       nullif(description, 'No Comments'), evidence_image
FROM public.man_pipes_maintenance;

-- Older rows linked a report the other way round, through
-- addressed_report_id. Keep that link (latest maintenance wins) where the
-- report has none of its own.
UPDATE public.reports r
SET resolved_by_maintenance_id = old.id
FROM (
  SELECT DISTINCT ON (addressed_report_id) addressed_report_id, id
  FROM (
    SELECT addressed_report_id, id, last_cleaned_at FROM public.inlets_maintenance
    UNION ALL SELECT addressed_report_id, id, last_cleaned_at FROM public.outlets_maintenance
    UNION ALL SELECT addressed_report_id, id, last_cleaned_at FROM public.storm_drains_maintenance
    UNION ALL SELECT addressed_report_id, id, last_cleaned_at FROM public.man_pipes_maintenance
  ) all_old
  WHERE addressed_report_id IS NOT NULL
  ORDER BY addressed_report_id, last_cleaned_at DESC
) old
WHERE r.id = old.addressed_report_id AND r.resolved_by_maintenance_id IS NULL;

-- Links that point at nothing would block the new foreign key.
UPDATE public.reports r
SET resolved_by_maintenance_id = NULL
WHERE resolved_by_maintenance_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.maintenance m WHERE m.id = r.resolved_by_maintenance_id);

UPDATE public.reports r
SET resolved_at = m.performed_at
FROM public.maintenance m
WHERE m.id = r.resolved_by_maintenance_id AND r.status = 'resolved' AND r.resolved_at IS NULL;

ALTER TABLE "public"."reports"
  DROP COLUMN "resolved_by_maintenance_type";

DROP TABLE "public"."inlets_maintenance";

DROP TABLE "public"."man_pipes_maintenance";

DROP TABLE "public"."outlets_maintenance";

DROP TABLE "public"."storm_drains_maintenance";

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
  SET status = p_status::text,
      resolved_by_maintenance_id = result.id,
      resolved_image = coalesce(p_evidence_image, resolved_image),
      resolved_at = CASE WHEN p_status = 'resolved' THEN result.performed_at ELSE resolved_at END
  WHERE component_id = p_component_name
    AND created_at <= result.performed_at
    AND status = ANY (CASE WHEN p_status = 'resolved'
                           THEN ARRAY['pending', 'in-progress']
                           ELSE ARRAY['pending'] END);

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."record_maintenance"(public.component_type, text, public.maintenance_status, text, text) FROM PUBLIC, "anon";

ALTER TABLE "public"."maintenance"
  ADD CONSTRAINT "maintenance_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES public.agencies(id);

ALTER TABLE "public"."maintenance"
  ADD CONSTRAINT "maintenance_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."reports"
  ADD CONSTRAINT "reports_resolved_by_maintenance_id_fkey" FOREIGN KEY (resolved_by_maintenance_id) REFERENCES public.maintenance(id) ON DELETE SET NULL;

CREATE INDEX idx_maintenance_agency_id ON public.maintenance USING btree (agency_id);

CREATE INDEX idx_maintenance_component ON public.maintenance USING btree (component_name, performed_at DESC);

CREATE INDEX idx_maintenance_performed_by ON public.maintenance USING btree (performed_by);

CREATE INDEX idx_reports_resolved_by_maintenance_id ON public.reports USING btree (resolved_by_maintenance_id);

CREATE POLICY "Enable read access for all users" ON "public"."maintenance"
  FOR SELECT
  TO PUBLIC
  USING (true);

COMMENT ON COLUMN "public"."maintenance"."component_name" IS 'The component''s name, e.g. I-0, O-0, ISD-1, C-0; matches reports.component_id.';

COMMENT ON COLUMN "public"."maintenance"."description" IS 'Agency comments, including photo notes and evidence-check notes.';

COMMENT ON COLUMN "public"."maintenance"."performed_by" IS 'The staff member who recorded it. Null once their account is deleted; agency_id still says who did the work.';

COMMENT ON COLUMN "public"."reports"."resolved_at" IS 'When the maintenance that resolved this report was done. Set only by record_maintenance.';

COMMENT ON COLUMN "public"."reports"."resolved_by_maintenance_id" IS 'The maintenance that last moved this report along (in-progress or resolved). Set only by record_maintenance.';

GRANT EXECUTE ON FUNCTION "public"."record_maintenance"(public.component_type, text, public.maintenance_status, text, text) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON TABLE "public"."maintenance" FROM "anon";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."maintenance" TO "anon";

REVOKE ALL ON TABLE "public"."maintenance" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."maintenance" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."maintenance" TO "postgres", "service_role";

GRANT USAGE ON TYPE "public"."component_type" TO "postgres";

GRANT USAGE ON TYPE "public"."maintenance_status" TO "postgres";
