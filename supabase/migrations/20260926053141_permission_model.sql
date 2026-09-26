SET local check_function_bodies = off;

DROP POLICY "Allow individual insert access" ON "public"."profiles";

DROP POLICY "Allow individual read access" ON "public"."profiles";

DROP POLICY "Allow individual update access" ON "public"."profiles";

DROP TRIGGER "on_profile_role_update" ON "public"."profiles";

ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_id_fkey";

DROP FUNCTION "public"."prevent_role_update"();

CREATE SCHEMA "private";

CREATE TABLE "private"."agency_join_codes" (
  "agency_id"  uuid                     NOT NULL,
  "code_hash"  text                     NOT NULL,
  "rotated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "agency_join_codes_pkey" PRIMARY KEY (agency_id)
);

ALTER TABLE "private"."agency_join_codes"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" DROP DEFAULT;

-- Hand-edited: declarative sync emitted a SET DEFAULT 'citizen'::user_role
-- here, before CREATE TYPE, which fails. Removed; the same statement follows
-- the type change below.

CREATE TYPE "public"."user_role" AS ENUM (
  'citizen',
  'staff',
  'admin'
);

-- Hand-edited: existing rows hold the old default 'user', which isn't a
-- user_role. On a database that has profiles with an agency_id (the hosted
-- project has 8), decide their role before applying: the
-- profiles_staff_have_agency check below rejects citizens with an agency.
ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" TYPE public.user_role
  USING (CASE "role" WHEN 'user' THEN 'citizen' ELSE "role" END)::public.user_role;

ALTER TABLE "public"."profiles"
  ALTER COLUMN "role" SET DEFAULT 'citizen'::public.user_role;

CREATE OR REPLACE FUNCTION private.can_manage_members()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select coalesce(auth.role(), 'postgres') not in ('anon', 'authenticated')
         or private.is_admin()
$function$;

CREATE OR REPLACE FUNCTION private.current_agency_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select p.agency_id
  from public.profiles p
  where p.id = (select auth.uid()) and p.role in ('staff', 'admin')
$function$;

CREATE OR REPLACE FUNCTION private.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
$function$;

CREATE OR REPLACE FUNCTION private.normalize_join_code (
  code text
)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO ''
  AS $function$
  select regexp_replace(upper(coalesce(code, '')), '[^A-Z0-9]', '', 'g')
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_agency (
  p_code text
)
  RETURNS public.agencies
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  candidate text := private.normalize_join_code(p_code);
  matched public.agencies;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to join an agency.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role <> 'citizen') THEN
    RAISE EXCEPTION 'You are already part of an agency. Leave it first.' USING ERRCODE = 'P0001';
  END IF;

  SELECT a.* INTO matched
  FROM private.agency_join_codes c
  JOIN public.agencies a ON a.id = c.agency_id
  WHERE c.code_hash = extensions.crypt(candidate, c.code_hash)
  LIMIT 1;

  IF matched.id IS NULL THEN
    RAISE EXCEPTION 'That code is not valid.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.profiles SET role = 'staff', agency_id = matched.id WHERE id = auth.uid();
  RETURN matched;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."join_agency"(text) FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.leave_agency()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  UPDATE public.profiles SET role = 'citizen', agency_id = NULL
  WHERE id = auth.uid() AND role = 'staff';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only agency staff can leave an agency.' USING ERRCODE = 'P0001';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."leave_agency"() FROM PUBLIC, "anon";

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT private.is_admin() THEN
    IF TG_OP = 'INSERT' AND (NEW.role <> 'citizen' OR NEW.agency_id IS NOT NULL) THEN
      RAISE EXCEPTION 'New profiles start as citizens.' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND (NEW.role IS DISTINCT FROM OLD.role
                             OR NEW.agency_id IS DISTINCT FROM OLD.agency_id) THEN
      RAISE EXCEPTION 'Only an admin can change a role or agency.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rotate_agency_join_code (
  p_agency_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
DECLARE
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  raw text := '';
BEGIN
  IF NOT private.can_manage_members() THEN
    RAISE EXCEPTION 'Only an admin can rotate a join code.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = p_agency_id) THEN
    RAISE EXCEPTION 'No such agency.' USING ERRCODE = 'P0002';
  END IF;

  -- 256 is a multiple of 32, so taking each random byte mod 32 is unbiased.
  FOR i IN 1..10 LOOP
    raw := raw || substr(alphabet, 1 + get_byte(extensions.gen_random_bytes(1), 0) % 32, 1);
  END LOOP;

  INSERT INTO private.agency_join_codes (agency_id, code_hash, rotated_at)
  VALUES (p_agency_id, extensions.crypt(raw, extensions.gen_salt('bf')), now())
  ON CONFLICT (agency_id) DO UPDATE
    SET code_hash = excluded.code_hash, rotated_at = excluded.rotated_at;

  RETURN substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 2);
END;
$function$;

REVOKE ALL ON FUNCTION "public"."rotate_agency_join_code"(uuid) FROM PUBLIC, "anon";

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

REVOKE ALL ON FUNCTION "public"."set_member_agency"(uuid, uuid, public.user_role) FROM PUBLIC, "anon";

ALTER TABLE "private"."agency_join_codes"
  ADD CONSTRAINT "agency_join_codes_agency_id_fkey" FOREIGN KEY (agency_id) REFERENCES public.agencies(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_staff_have_agency" CHECK (((role = 'citizen'::public.user_role) = (agency_id IS NULL)));

CREATE TRIGGER protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileges();

CREATE POLICY "Allow individual insert access" ON "public"."profiles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Allow individual read access" ON "public"."profiles"
  FOR SELECT
  TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Allow individual update access" ON "public"."profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

GRANT EXECUTE ON FUNCTION "private"."can_manage_members"() TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."current_agency_id"() TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."is_admin"() TO "postgres";

GRANT EXECUTE ON FUNCTION "private"."normalize_join_code"(text) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."join_agency"(text) TO "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."leave_agency"() TO "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."protect_profile_privileges"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."rotate_agency_join_code"(uuid) TO "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."set_member_agency"(uuid, uuid, public.user_role) TO "authenticated", "postgres", "service_role";

GRANT USAGE ON SCHEMA "private" TO "anon", "authenticated";

GRANT CREATE, USAGE ON SCHEMA "private" TO "postgres";

GRANT USAGE ON SCHEMA "private" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "private"."agency_join_codes" TO "postgres";

GRANT USAGE ON TYPE "public"."user_role" TO "postgres";
