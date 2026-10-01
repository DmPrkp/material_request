CREATE TABLE "visitors" (
	"ip" "inet" PRIMARY KEY NOT NULL,
	"first_seen" timestamp with time zone NOT NULL,
	"last_seen" timestamp with time zone NOT NULL,
	"visits" integer NOT NULL,
	"is_bot" boolean NOT NULL,
	"user_agent" text,
	"last_path" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "visits_cursor" (
	"id" smallint PRIMARY KEY NOT NULL,
	"file_id" varchar(64) NOT NULL,
	"offset" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "visitors_last_seen_idx" ON "visitors" USING btree ("last_seen");