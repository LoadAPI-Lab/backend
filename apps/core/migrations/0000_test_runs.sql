CREATE TYPE "public"."test_run_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'STOPPED');
CREATE TYPE "public"."test_type" AS ENUM('single', 'scenario', 'batch', 'round_robin');
CREATE TABLE "test_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" "test_type" NOT NULL,
	"status" "test_run_status" NOT NULL,
	"config" jsonb NOT NULL,
	"reason" text,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);

CREATE INDEX "test_runs_status_idx" ON "test_runs" USING btree ("status");