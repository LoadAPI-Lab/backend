DROP INDEX "test_runs_created_at_idx";
DELETE FROM "test_runs";
ALTER TABLE "test_runs" ADD COLUMN "user_id" uuid NOT NULL;
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "test_runs_user_created_at_idx" ON "test_runs" USING btree ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);