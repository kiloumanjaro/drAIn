ALTER TABLE "public"."flood_results"
  ALTER COLUMN "cluster_score" SET NOT NULL;

ALTER TABLE "public"."flood_results"
  ALTER COLUMN "cluster" SET NOT NULL;

ALTER TABLE "public"."flood_results"
  ALTER COLUMN "hours_flooded" SET NOT NULL;

ALTER TABLE "public"."flood_results"
  ALTER COLUMN "max_rate_cms" SET NOT NULL;

ALTER TABLE "public"."flood_results"
  ALTER COLUMN "time_after_raining_min" SET NOT NULL;

ALTER TABLE "public"."flood_results"
  ALTER COLUMN "time_of_max" SET NOT NULL;

ALTER TABLE "public"."flood_results"
  ALTER COLUMN "total_flood_volume_megalitres" SET NOT NULL;

ALTER TABLE "public"."flood_results"
  ALTER COLUMN "vulnerability_category" SET NOT NULL;

ALTER TABLE "public"."flood_results"
  ALTER COLUMN "vulnerability_rank" SET NOT NULL;
