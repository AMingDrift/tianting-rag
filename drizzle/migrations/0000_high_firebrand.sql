CREATE TABLE "chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"chunk" text NOT NULL,
	"meta" jsonb NOT NULL,
	"embedding" vector(1024) NOT NULL
);
