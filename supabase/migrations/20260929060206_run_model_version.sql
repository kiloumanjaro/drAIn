ALTER TABLE "public"."simulation_runs"
  ADD COLUMN "model_version" text;

COMMENT ON COLUMN "public"."simulation_runs"."model_version" IS 'SHA-256 of the network (.inp) file the run used, from metadata.model_info.network_sha256. Null for runs recorded before it was stamped.';
