-- Hand-edited: the USING casts strip thousands separators ("4,387"), which
-- the hosted rows carry; a plain cast would fail on them.
ALTER TABLE "public"."barangay_boundaries"
  ALTER COLUMN "land_area" DROP DEFAULT;

ALTER TABLE "public"."barangay_boundaries"
  ALTER COLUMN "land_area" TYPE numeric USING replace("land_area", ',', '')::numeric;

ALTER TABLE "public"."barangay_boundaries"
  ALTER COLUMN "population_count" DROP DEFAULT;

ALTER TABLE "public"."barangay_boundaries"
  ALTER COLUMN "population_count" TYPE integer USING replace("population_count", ',', '')::integer;

ALTER TABLE "public"."barangay_boundaries"
  ALTER COLUMN "population_density" DROP DEFAULT;

ALTER TABLE "public"."barangay_boundaries"
  ALTER COLUMN "population_density" TYPE numeric USING replace("population_density", ',', '')::numeric;
