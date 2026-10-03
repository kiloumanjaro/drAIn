SET local check_function_bodies = off;

ALTER TABLE "public"."profiles"
  ADD COLUMN "show_name_on_reports" boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.set_reporter_name()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT CASE WHEN p.show_name_on_reports THEN coalesce(nullif(p.full_name, ''), 'Anonymous')
                ELSE 'Anonymous' END
    INTO NEW.reporter_name
    FROM public.profiles p
    WHERE p.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_reporter_name()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  UPDATE public.reports
  SET reporter_name = CASE WHEN NEW.show_name_on_reports
                           THEN coalesce(nullif(NEW.full_name, ''), 'Anonymous')
                           ELSE 'Anonymous' END
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER sync_reporter_name
  AFTER UPDATE OF full_name, show_name_on_reports ON public.profiles
  FOR EACH ROW
  WHEN (((old.full_name IS DISTINCT FROM new.full_name) OR (old.show_name_on_reports IS DISTINCT FROM new.show_name_on_reports)))
  EXECUTE FUNCTION public.sync_reporter_name();

CREATE TRIGGER set_reporter_name
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_reporter_name();

COMMENT ON COLUMN "public"."profiles"."show_name_on_reports" IS 'When false, this person''s reports show "Anonymous" instead of their name. Applied by set_reporter_name and sync_reporter_name.';

GRANT EXECUTE ON FUNCTION "public"."set_reporter_name"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."sync_reporter_name"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";
