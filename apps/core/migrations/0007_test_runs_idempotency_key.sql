DROP INDEX "test_runs_user_active_config_hash_uidx";
ALTER TABLE "test_runs" ADD COLUMN "idempotency_key" text;
CREATE UNIQUE INDEX "test_runs_user_idempotency_key_uidx" ON "test_runs" USING btree ("user_id","idempotency_key") WHERE "test_runs"."idempotency_key" is not null;