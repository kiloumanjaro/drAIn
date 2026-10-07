SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION private.can_manage_agency (
  p_agency_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select case
    when private.is_api_caller()
      then p_agency_id is not null
           and private.is_admin()
           and private.current_agency_id() = p_agency_id
    else true
  end
$function$;

CREATE OR REPLACE FUNCTION private.is_api_caller()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select coalesce(current_setting('role', true), '') in ('anon', 'authenticated')
         or coalesce(auth.role(), '') in ('anon', 'authenticated')
$function$;

CREATE OR REPLACE FUNCTION public.check_report_submission()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  key text := private.reporter_key();
  per_hour integer := CASE WHEN auth.uid() IS NULL THEN 3 ELSE 5 END;
  per_day integer := 10;
BEGIN
  IF private.is_api_caller() THEN
    NEW.created_at := now();
    NEW.review_status := 'unreviewed';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.review_note := NULL;
    NEW.resolved_at := NULL;
    NEW.address := NULL;
    NEW.geocoded_status := 'pending';
    IF NEW.image IS NOT NULL
       AND NEW.image !~ '^public/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,5}$' THEN
      RAISE EXCEPTION 'The photo must be uploaded through the app.' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('report_submission:' || key));

    IF (SELECT count(*) FROM private.report_sources
        WHERE reporter_key = key AND created_at > now() - interval '1 hour') >= per_hour
       OR (SELECT count(*) FROM private.report_sources
           WHERE reporter_key = key AND created_at > now() - interval '1 day') >= per_day THEN
      RAISE EXCEPTION 'You have sent a lot of reports recently. Please try again later.'
        USING ERRCODE = 'P0001', HINT = 'rate_limited';
    END IF;

    IF NEW.component_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM private.report_sources s
      JOIN public.reports r ON r.id = s.report_id
      WHERE s.reporter_key = key
        AND r.component_id = NEW.component_id
        AND r.status <> 'resolved'
        AND r.review_status <> 'rejected'
    ) THEN
      RAISE EXCEPTION 'You already have an open report on %. It will update when staff record work on it.',
        NEW.component_id
        USING ERRCODE = 'P0001', HINT = 'duplicate_report';
    END IF;

    INSERT INTO private.report_sources (report_id, reporter_key) VALUES (NEW.id, key);
  END IF;
  DELETE FROM private.report_sources
  WHERE reporter_key LIKE 'ip:%' AND created_at < now() - interval '30 days';

  NEW.photo_distance_m := NULL;
  IF NEW.photo_lat IS NOT NULL AND NEW.photo_lon IS NOT NULL THEN
    SELECT extensions.st_distance(
             c.location,
             extensions.st_setsrid(extensions.st_makepoint(NEW.photo_lon, NEW.photo_lat), 4326)::extensions.geography)
    INTO NEW.photo_distance_m
    FROM public.components c
    WHERE c.name = NEW.component_id;
  END IF;
  NEW.photo_check := CASE
    WHEN NEW.photo_distance_m IS NULL THEN 'missing'
    WHEN NEW.photo_distance_m <= 100 THEN 'match'
    ELSE 'mismatch'
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_bulk_report_insert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  IF private.is_api_caller()
     AND (SELECT count(*) FROM new_reports) > 1 THEN
    RAISE EXCEPTION 'File one report at a time.' USING ERRCODE = 'P0001', HINT = 'rate_limited';
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_member_agency (
  p_user_id   uuid,
  p_agency_id uuid,
  p_role      public.user_role
)
  RETURNS public.profiles
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  target_agency uuid;
  result public.profiles;
BEGIN
  IF NOT private.can_manage_agency(p_agency_id) THEN
    RAISE EXCEPTION 'Only an admin can change a role or agency.' USING ERRCODE = '42501';
  END IF;
  -- An admin demoting themselves could leave an agency with no admin.
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t change your own role or agency; ask another admin.'
      USING ERRCODE = '42501';
  END IF;

  SELECT agency_id INTO target_agency FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such user.' USING ERRCODE = 'P0002';
  END IF;
  IF target_agency IS NOT NULL AND NOT private.can_manage_agency(target_agency) THEN
    RAISE EXCEPTION 'That person belongs to another agency.' USING ERRCODE = '42501';
  END IF;
  IF target_agency IS NULL AND private.is_api_caller() THEN
    RAISE EXCEPTION 'People join an agency with its join code.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET role = p_role,
      agency_id = CASE WHEN p_role = 'citizen' THEN NULL ELSE p_agency_id END
  WHERE id = p_user_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'No such user.' USING ERRCODE = 'P0002';
  END IF;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION "private"."is_api_caller"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "private"."is_api_caller"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "private"."is_api_caller"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "private"."is_api_caller"() TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."is_api_caller"() TO "service_role";
