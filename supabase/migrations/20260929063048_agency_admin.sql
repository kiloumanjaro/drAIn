SET local check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.agency_members (
  p_agency_id uuid
)
  RETURNS TABLE (
    id                 uuid,
    full_name          text,
    email              text,
    role               public.user_role,
    account_created_at timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  IF NOT private.can_manage_members() THEN
    RAISE EXCEPTION 'Only an admin can list an agency''s members.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT p.id, p.full_name, u.email::text, p.role, p.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.agency_id = p_agency_id
    ORDER BY p.role DESC, p.full_name NULLS LAST, p.id;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."agency_members"(uuid) FROM PUBLIC, "anon";

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
  result public.profiles;
BEGIN
  IF NOT private.can_manage_members() THEN
    RAISE EXCEPTION 'Only an admin can change a role or agency.' USING ERRCODE = '42501';
  END IF;
  -- An admin demoting themselves could leave an agency with no admin.
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You can''t change your own role or agency; ask another admin.'
      USING ERRCODE = '42501';
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

GRANT EXECUTE ON FUNCTION "public"."agency_members"(uuid) TO "authenticated", "postgres", "service_role";
