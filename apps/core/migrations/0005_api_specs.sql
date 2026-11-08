CREATE TABLE "api_specs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"version" text NOT NULL,
	"description" text,
	"source" text NOT NULL,
	"servers" jsonb NOT NULL,
	"endpoints" jsonb NOT NULL,
	"endpoints_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "api_specs" ADD CONSTRAINT "api_specs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "api_specs_user_created_at_idx" ON "api_specs" USING btree ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);