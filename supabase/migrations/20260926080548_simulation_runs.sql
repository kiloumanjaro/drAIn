CREATE TABLE "public"."simulation_runs" (
  "id"          uuid                     NOT NULL,
  "user_id"     uuid                     NOT NULL,
  "request"     jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  "result"      jsonb,
  "error"       text,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  "started_at"  timestamp with time zone,
  "finished_at" timestamp with time zone,
  CONSTRAINT "simulation_runs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."simulation_runs"
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."simulation_runs" FROM "anon";

CREATE TYPE "public"."simulation_status" AS ENUM (
  'queued',
  'running',
  'succeeded',
  'failed'
);

ALTER TABLE "public"."simulation_runs"
  ADD COLUMN "status" public.simulation_status NOT NULL DEFAULT 'queued'::public.simulation_status;

ALTER TABLE "public"."simulation_runs"
  ADD CONSTRAINT "simulation_runs_outcome_check" CHECK (((status <> 'succeeded'::public.simulation_status) OR (result IS NOT NULL)));

ALTER TABLE "public"."simulation_runs"
  ADD CONSTRAINT "simulation_runs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_simulation_runs_created_at ON public.simulation_runs USING btree (created_at);

CREATE INDEX idx_simulation_runs_user_created ON public.simulation_runs USING btree (user_id, created_at DESC);

CREATE POLICY "Users can read their own runs" ON "public"."simulation_runs"
  FOR SELECT
  TO "authenticated"
  USING ((user_id = ( SELECT auth.uid() AS uid)));

COMMENT ON COLUMN "public"."simulation_runs"."id" IS 'The simulation server''s job id; the app polls /simulations/<id>.';

COMMENT ON COLUMN "public"."simulation_runs"."request" IS 'What was asked for: node and link overrides and the storm.';

COMMENT ON COLUMN "public"."simulation_runs"."result" IS 'The finished payload without nodes_dict, which repeats nodes_list keyed by node and is rebuilt on read.';

COMMENT ON TABLE "public"."simulation_runs" IS 'Written only by the simulation server (service role). A user can read their own runs.';

REVOKE ALL ON TABLE "public"."simulation_runs" FROM "authenticated";

GRANT MAINTAIN, REFERENCES, SELECT, TRIGGER ON TABLE "public"."simulation_runs" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."simulation_runs" TO "postgres", "service_role";

GRANT USAGE ON TYPE "public"."simulation_status" TO "postgres";
