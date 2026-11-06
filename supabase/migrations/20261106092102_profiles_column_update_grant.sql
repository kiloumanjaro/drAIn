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
  IF NOT private.can_manage_agency(p_agency_id) THEN
    RAISE EXCEPTION 'Only an admin can list an agency''s members.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT p.id, p.full_name, u.email::text, p.role, u.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.agency_id = p_agency_id
    ORDER BY p.role DESC, p.full_name NULLS LAST, p.id;
END;
$function$;

-- Hand-edited: the table-level revoke was generated after the column grants,
-- which would have revoked them too (revoking a table privilege drops its
-- column grants). Moved up.
REVOKE ALL ON TABLE "public"."profiles" FROM "authenticated";

GRANT INSERT, SELECT ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("avatar_url") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("avatar_url") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("full_name") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("full_name") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("id") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("id") ON TABLE "public"."profiles" TO "authenticated";

REVOKE ALL ("show_name_on_reports") ON TABLE "public"."profiles" FROM "authenticated";

GRANT UPDATE ("show_name_on_reports") ON TABLE "public"."profiles" TO "authenticated";
