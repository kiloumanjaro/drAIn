SET local check_function_bodies = off;

ALTER TABLE "public"."components"
  ADD COLUMN "attributes" jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "public"."components"
  ADD COLUMN "path" extensions.geography(Geometry,4326);

-- Hand-edited: the generated migration dropped the four GIS tables first.
-- Their attributes and pipe lines are copied into components before they go
-- (checked on 2026-09-29 against public/drainage/*.geojson: all 1,555
-- features equal).
-- Fill components.attributes (the GeoJSON properties the app reads, under
-- the GeoJSON's own names) and components.path (pipe lines) from the four
-- GIS tables, before they are dropped.
UPDATE public.components c
SET attributes = jsonb_build_object(
      'X', t.x, 'Y', t.y, 'Inv_Elev', t.inv_elev, 'MaxDepth', t.maxdepth,
      'Length', t.length, 'Height', t.height, 'Weir_Coeff', t.weir_coeff,
      'In_Type', t.in_type, 'In_Name', t.name, 'ClogFac', t.clogfac,
      'ClogTime', t.clogtime, 'FPLAIN_080', t.fplain_080)
FROM public.inlets t
WHERE c.type = 'inlets' AND c.name = t.name;

UPDATE public.components c
SET attributes = jsonb_build_object(
      'Join_Count', t.join_count, 'TARGET_FID', t.target_fid,
      'Inv_Elev', t.inv_elev, 'AllowQ', t.allowq, 'FlapGate', t.flapgate,
      'X', t.x, 'Y', t.y, 'Out_Name', t.name, 'FPLAIN_080', t.fplain_080)
FROM public.outlets t
WHERE c.type = 'outlets' AND c.name = t.name;

UPDATE public.components c
SET attributes = jsonb_build_object(
      'InvElev', t.invelev, 'x', t.x, 'y', t.y, 'clog_per', t.clog_per,
      'clogtime', t.clogtime, 'Weir_coeff', t.weir_coeff, 'Length', t.length,
      'Height', t.height, 'Max_Depth', t.max_depth, 'In_Name', t.name,
      'ClogFac', t.clogfac, 'Id', t.id, 'NameNum', t.namenum,
      'FPLAIN_080', t.fplain_080)
FROM public.storm_drains t
WHERE c.type = 'storm_drains' AND c.name = t.name;

UPDATE public.components c
SET attributes = jsonb_build_object(
      'TYPE', t.type, 'Length', t.length, 'Width', t.width,
      'Height', t.height, 'Pipe_Shape', t.pipe_shape,
      'Pipe_Lngth', t.pipe_lngth, 'Mannings', t.mannings,
      'Barrels', t.barrels, 'Name', t.name, 'ClogPer', t.clogper,
      'ClogTime', t.clogtime),
    -- A single-part line as a LineString, as the GIS export wrote it; the
    -- two pipes with several parts stay MultiLineStrings.
    path = (case when extensions.st_numgeometries(t.geom) = 1
                 then extensions.st_geometryn(t.geom, 1)
                 else t.geom end)::extensions.geography
FROM public.man_pipes t
WHERE c.type = 'man_pipes' AND c.name = t.name;

DROP TABLE "public"."inlets";
DROP TABLE "public"."man_pipes";
DROP TABLE "public"."outlets";
DROP TABLE "public"."storm_drains";

CREATE OR REPLACE FUNCTION public.network_geojson (
  p_type public.component_type
)
  RETURNS jsonb
  LANGUAGE sql
  STABLE
  SET search_path TO ''
  AS $function$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'name', case p_type
              when 'inlets' then 'Inlets'
              when 'outlets' then 'Outlets'
              when 'man_pipes' then 'Man_Pipes'
              when 'storm_drains' then 'StormDrains'
            end,
    'crs', jsonb_build_object(
      'type', 'name',
      'properties', jsonb_build_object('name', 'urn:ogc:def:crs:OGC:1.3:CRS84')),
    'features', coalesce(jsonb_agg(
      jsonb_build_object(
        'type', 'Feature',
        'properties', c.attributes,
        'geometry', extensions.st_asgeojson(coalesce(c.path, c.location), 15)::jsonb)
      -- Numeric order of the id (I-2 before I-10), as the GIS export had it.
      order by nullif(regexp_replace(c.name, '\D', '', 'g'), '')::bigint nulls last, c.name
    ), '[]'::jsonb))
  from public.components c
  where c.type = p_type
$function$;

REVOKE ALL ON FUNCTION "public"."network_geojson"(public.component_type) FROM PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."network_geojson"(public.component_type) TO "postgres", "service_role";
