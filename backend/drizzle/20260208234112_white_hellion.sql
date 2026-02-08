CREATE TABLE "user_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"timezone" text NOT NULL,
	"calculation_method" text DEFAULT 'MWL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
