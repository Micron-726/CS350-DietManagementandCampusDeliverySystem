ALTER TABLE "menu_items" ALTER COLUMN "base_price_krw" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "service_date" date;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "source_url" text;--> statement-breakpoint
CREATE INDEX "menu_items_restaurant_service_date_idx" ON "menu_items" USING btree ("restaurant_id","service_date");