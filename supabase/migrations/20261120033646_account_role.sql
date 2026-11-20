CREATE TYPE "public"."account_role" AS ENUM('customer', 'restaurant');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" "account_role" DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "restaurants_owner_idx" ON "restaurants" USING btree ("owner_id");