CREATE TABLE "azan_audio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"mimetype" text NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
