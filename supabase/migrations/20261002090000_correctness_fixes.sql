-- Correctness fixes from the 2026-10-02 quality audit.
--
--  1. record_maintenance wrote its evidence photo into reports.resolved_image
--     for in-progress work too, so an unfixed report offered a "photo after
--     the fix", and a mid-work photo could survive as the fix photo when a
--     later photo-less resolve closed the report. The photo now lands on the
--     report only when the work is resolved. The function also refuses a
--     component_type that contradicts the named component (only hand-crafted
--     API calls could send one).
--  2. Neither storage bucket had a DELETE policy, so the app's cleanup of a
--     just-uploaded file after a failed save silently did nothing: a refused
--     report insert left an orphaned photo that still counted against the
--     uploader's daily allowance (10/day, the same as the report limit, so a
--     few failed retries locked reporting for a day). Owners may now remove
--     their own ReportImage upload while it is fresh (1 hour) and nothing
--     references it, and their own avatar. Deleting restores the allowance.

CREATE OR REPLACE FUNCTION "public"."record_maintenance"("p_component_type" "public"."component_type", "p_component_name" "text", "p_status" "public"."maintenance_status", "p_description" "text" DEFAULT NULL::"text", "p_evidence_image" "text" DEFAULT NULL::"text") RETURNS "public"."maintenance"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  staff_agency uuid := private.current_agency_id();
  result public.maintenance;
BEGIN
  IF staff_agency IS NULL THEN
    RAISE EXCEPTION 'Only agency staff can record maintenance.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.components c
                 WHERE c.name = p_component_name AND c.type = p_component_type) THEN
    RAISE EXCEPTION 'No % named %.', p_component_type, p_component_name
      USING ERRCODE = '22023';
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
      -- The "photo after the fix" only exists once the work is resolved; an
      -- in-progress photo stays on the maintenance row alone.
      resolved_image = CASE WHEN p_status = 'resolved'
                            THEN coalesce(p_evidence_image, resolved_image)
                            ELSE resolved_image END,
      resolved_at = CASE WHEN p_status = 'resolved' THEN result.performed_at ELSE resolved_at END
  WHERE component_id = p_component_name
    AND created_at <= result.performed_at
    AND review_status <> 'rejected'
    AND status = ANY (CASE WHEN p_status = 'resolved'
                           THEN ARRAY['pending', 'in-progress']::public.report_status[]
                           ELSE ARRAY['pending']::public.report_status[] END);

  RETURN result;
END;
$$;

-- Cleanup of a photo whose report was refused: the owner may delete their own
-- fresh upload while nothing references it. The reference check covers every
-- place a path can land (reports.image, reports.resolved_image,
-- maintenance.evidence_image). The 1-hour window keeps the policy to its
-- purpose; it is not an "undo" for published photos.
CREATE POLICY "Uploaders remove their own fresh unused report photo" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'ReportImage'::"text") AND ("owner_id" = (( SELECT "auth"."uid"() AS "uid"))::"text") AND ("created_at" > ("now"() - '01:00:00'::interval)) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."reports" "r"
  WHERE (("r"."image" = "objects"."name") OR ("r"."resolved_image" = "objects"."name"))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."maintenance" "m"
  WHERE ("m"."evidence_image" = "objects"."name"))))));

-- The avatar flow already tried to remove the old upload after a failed
-- profile save; without a DELETE policy that remove was a silent no-op.
CREATE POLICY "Users remove their own avatars" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'Avatars'::"text") AND ((( SELECT "auth"."uid"() AS "uid"))::"text" = ("storage"."foldername"("name"))[1])));
