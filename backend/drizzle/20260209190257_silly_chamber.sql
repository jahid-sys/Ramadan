CREATE TABLE "quran_verses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"surah_number" integer NOT NULL,
	"ayah_number" integer NOT NULL,
	"arabic_text" text NOT NULL,
	"english_translation" text NOT NULL,
	"surah_name_arabic" text NOT NULL,
	"surah_name_english" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
