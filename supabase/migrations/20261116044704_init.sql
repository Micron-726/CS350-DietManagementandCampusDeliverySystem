CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'light', 'moderate', 'active', 'very_active');--> statement-breakpoint
CREATE TYPE "public"."component_type" AS ENUM('rice', 'meat', 'sauce', 'dessert', 'tofu', 'topping', 'egg', 'bread', 'other');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'preparing', 'ready_for_pickup', 'in_transit', 'delivered', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_type" AS ENUM('delivery', 'pickup');--> statement-breakpoint
CREATE TYPE "public"."goal_mode" AS ENUM('deficit', 'maintenance', 'surplus');--> statement-breakpoint
CREATE TYPE "public"."meal_log_source" AS ENUM('manual', 'menu', 'order');--> statement-breakpoint
CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."nutrition_source" AS ENUM('provider', 'calculated', 'estimated', 'user', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'submitted', 'confirmed', 'failed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."provider_kind" AS ENUM('restaurant', 'delivery', 'aggregator');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."target_source" AS ENUM('calculated', 'custom');--> statement-breakpoint
CREATE TABLE "deliveries" (
	"order_id" uuid PRIMARY KEY NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"address_label" text,
	"lat" double precision,
	"lng" double precision,
	"request_note" text,
	"tracking_url" text,
	"eta_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "diet_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"effective_from" date NOT NULL,
	"goal_mode" "goal_mode" DEFAULT 'maintenance' NOT NULL,
	"adjustment_kcal" smallint DEFAULT 0 NOT NULL,
	"recommended_kcal" real,
	"calorie_target_kcal" real NOT NULL,
	"calorie_target_source" "target_source" DEFAULT 'calculated' NOT NULL,
	"recommended_protein_g" real,
	"protein_target_g" real NOT NULL,
	"protein_target_source" "target_source" DEFAULT 'calculated' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diet_goals_user_date_uq" UNIQUE("user_id","effective_from"),
	CONSTRAINT "diet_goals_adjustment" CHECK (("diet_goals"."goal_mode" = 'maintenance' and "diet_goals"."adjustment_kcal" = 0)
       or ("diet_goals"."goal_mode" <> 'maintenance' and "diet_goals"."adjustment_kcal" in (100, 200, 300, 400))),
	CONSTRAINT "diet_goals_targets_positive" CHECK ("diet_goals"."calorie_target_kcal" > 0 and "diet_goals"."protein_target_g" >= 0)
);
--> statement-breakpoint
ALTER TABLE "diet_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "integration_logs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "integration_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"provider_id" uuid,
	"order_id" uuid,
	"operation" text NOT NULL,
	"success" boolean NOT NULL,
	"http_status" smallint,
	"error_code" text,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "meal_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"log_date" date NOT NULL,
	"eaten_at" timestamp with time zone NOT NULL,
	"meal_type" "meal_type",
	"name" text NOT NULL,
	"kcal" real,
	"kcal_source" "nutrition_source" DEFAULT 'user' NOT NULL,
	"protein_g" real,
	"protein_source" "nutrition_source" DEFAULT 'user' NOT NULL,
	"source" "meal_log_source" DEFAULT 'manual' NOT NULL,
	"menu_item_id" uuid,
	"order_item_id" uuid,
	"portions" jsonb,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_logs_nutrition_nonneg" CHECK (("meal_logs"."kcal" is null or "meal_logs"."kcal" >= 0) and ("meal_logs"."protein_g" is null or "meal_logs"."protein_g" >= 0)),
	CONSTRAINT "meal_logs_kcal_unavailable_null" CHECK ("meal_logs"."kcal_source" <> 'unavailable' or "meal_logs"."kcal" is null),
	CONSTRAINT "meal_logs_protein_unavailable_null" CHECK ("meal_logs"."protein_source" <> 'unavailable' or "meal_logs"."protein_g" is null)
);
--> statement-breakpoint
ALTER TABLE "meal_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "meal_searches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"target_kcal" real,
	"target_protein_g" real,
	"max_price_krw" integer,
	"max_distance_m" integer,
	"result_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_searches_has_target" CHECK ("meal_searches"."target_kcal" is not null or "meal_searches"."target_protein_g" is not null)
);
--> statement-breakpoint
ALTER TABLE "meal_searches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "menu_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"type" "component_type" NOT NULL,
	"name" text NOT NULL,
	"external_id" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_components" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"image_url" text,
	"base_price_krw" integer NOT NULL,
	"base_kcal" real,
	"kcal_source" "nutrition_source" DEFAULT 'unavailable' NOT NULL,
	"base_protein_g" real,
	"protein_source" "nutrition_source" DEFAULT 'unavailable' NOT NULL,
	"extra_nutrition" jsonb,
	"is_available" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_restaurant_external_uq" UNIQUE("restaurant_id","external_id"),
	CONSTRAINT "menu_items_price_nonneg" CHECK ("menu_items"."base_price_krw" >= 0),
	CONSTRAINT "menu_items_kcal_unavailable_null" CHECK ("menu_items"."kcal_source" <> 'unavailable' or "menu_items"."base_kcal" is null),
	CONSTRAINT "menu_items_protein_unavailable_null" CHECK ("menu_items"."protein_source" <> 'unavailable' or "menu_items"."base_protein_g" is null)
);
--> statement-breakpoint
ALTER TABLE "menu_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"source" text NOT NULL,
	"message" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_events_kind" CHECK ("order_events"."kind" in ('order', 'payment', 'delivery'))
);
--> statement-breakpoint
ALTER TABLE "order_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"name" text NOT NULL,
	"quantity" smallint DEFAULT 1 NOT NULL,
	"unit_price_krw" integer NOT NULL,
	"kcal" real,
	"kcal_source" "nutrition_source" NOT NULL,
	"protein_g" real,
	"protein_source" "nutrition_source" NOT NULL,
	"portions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_quantity_pos" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_kcal_unavailable_null" CHECK ("order_items"."kcal_source" <> 'unavailable' or "order_items"."kcal" is null),
	CONSTRAINT "order_items_protein_unavailable_null" CHECK ("order_items"."protein_source" <> 'unavailable' or "order_items"."protein_g" is null)
);
--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_order_id" text,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"fulfillment_type" "fulfillment_type" DEFAULT 'delivery' NOT NULL,
	"total_price_krw" integer NOT NULL,
	"total_kcal" real,
	"total_protein_g" real,
	"failure_reason" text,
	"submitted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_idempotencyKey_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "orders_provider_order_uq" UNIQUE("provider_id","provider_order_id"),
	CONSTRAINT "orders_confirmed_has_provider_id" CHECK ("orders"."status" not in ('confirmed', 'completed') or "orders"."provider_order_id" is not null),
	CONSTRAINT "orders_total_nonneg" CHECK ("orders"."total_price_krw" >= 0)
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"provider_payment_ref" text,
	"method" text,
	"amount_krw" integer NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "portion_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component_id" uuid NOT NULL,
	"level" smallint NOT NULL,
	"label" text NOT NULL,
	"external_option_id" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"price_delta_krw" integer DEFAULT 0 NOT NULL,
	"kcal_delta" real,
	"kcal_source" "nutrition_source" DEFAULT 'unavailable' NOT NULL,
	"protein_delta_g" real,
	"protein_source" "nutrition_source" DEFAULT 'unavailable' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portion_levels_component_level_uq" UNIQUE("component_id","level"),
	CONSTRAINT "portion_levels_kcal_unavailable_null" CHECK ("portion_levels"."kcal_source" <> 'unavailable' or "portion_levels"."kcal_delta" is null),
	CONSTRAINT "portion_levels_protein_unavailable_null" CHECK ("portion_levels"."protein_source" <> 'unavailable' or "portion_levels"."protein_delta_g" is null)
);
--> statement-breakpoint
ALTER TABLE "portion_levels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"height_cm" real,
	"weight_kg" real,
	"age" smallint,
	"sex" "sex",
	"activity_level" "activity_level",
	"unit_prefs" jsonb DEFAULT '{"energy":"kcal","weight":"kg","height":"cm","distance":"km"}'::jsonb NOT NULL,
	"timezone" text DEFAULT 'Asia/Seoul' NOT NULL,
	"default_location_label" text,
	"default_lat" double precision,
	"default_lng" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_height_range" CHECK ("profiles"."height_cm" is null or "profiles"."height_cm" between 50 and 300),
	CONSTRAINT "profiles_weight_range" CHECK ("profiles"."weight_kg" is null or "profiles"."weight_kg" between 20 and 400),
	CONSTRAINT "profiles_age_range" CHECK ("profiles"."age" is null or "profiles"."age" between 10 and 120),
	CONSTRAINT "profiles_unit_prefs_valid" CHECK ("profiles"."unit_prefs"->>'energy' in ('kcal', 'kJ')
      and "profiles"."unit_prefs"->>'weight' in ('kg', 'lb')
      and "profiles"."unit_prefs"->>'height' in ('cm', 'in')
      and "profiles"."unit_prefs"->>'distance' in ('m', 'km', 'mi'))
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" "provider_kind" NOT NULL,
	"supports_ordering" boolean DEFAULT false NOT NULL,
	"supports_delivery" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "providers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "providers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" text,
	"campus_area" text,
	"lat" double precision,
	"lng" double precision,
	"geo" "geography" GENERATED ALWAYS AS ((st_setsrid(st_makepoint(lng, lat), 4326))::geography) STORED,
	"image_url" text,
	"opening_hours" jsonb,
	"accepting_orders" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_provider_external_uq" UNIQUE("provider_id","external_id")
);
--> statement-breakpoint
ALTER TABLE "restaurants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "weight_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid DEFAULT auth.uid() NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"weight_kg" real NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weight_logs_range" CHECK ("weight_logs"."weight_kg" between 20 and 400)
);
--> statement-breakpoint
ALTER TABLE "weight_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_goals" ADD CONSTRAINT "diet_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_logs" ADD CONSTRAINT "integration_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_logs" ADD CONSTRAINT "meal_logs_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_searches" ADD CONSTRAINT "meal_searches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_components" ADD CONSTRAINT "menu_components_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portion_levels" ADD CONSTRAINT "portion_levels_component_id_menu_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."menu_components"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_logs_user_date_idx" ON "meal_logs" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_logs_order_item_uq" ON "meal_logs" USING btree ("order_item_id") WHERE "meal_logs"."order_item_id" is not null;--> statement-breakpoint
CREATE INDEX "meal_searches_user_time_idx" ON "meal_searches" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "menu_components_menu_idx" ON "menu_components" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "menu_items_restaurant_idx" ON "menu_items" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "menu_items_kcal_protein_idx" ON "menu_items" USING btree ("base_kcal","base_protein_g");--> statement-breakpoint
CREATE INDEX "menu_items_price_idx" ON "menu_items" USING btree ("base_price_krw");--> statement-breakpoint
CREATE INDEX "order_events_order_time_idx" ON "order_events" USING btree ("order_id","occurred_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_user_time_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portion_levels_one_default_uq" ON "portion_levels" USING btree ("component_id") WHERE "portion_levels"."is_default";--> statement-breakpoint
CREATE INDEX "restaurants_geo_gist" ON "restaurants" USING gist ("geo");--> statement-breakpoint
CREATE INDEX "weight_logs_user_time_idx" ON "weight_logs" USING btree ("user_id","recorded_at");--> statement-breakpoint
CREATE POLICY "deliveries: order owner read" ON "deliveries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from orders o where o.id = "deliveries"."order_id" and o.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "diet_goals: owner full access" ON "diet_goals" AS PERMISSIVE FOR ALL TO "authenticated" USING ("diet_goals"."user_id" = (select auth.uid())) WITH CHECK ("diet_goals"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "meal_logs: owner full access" ON "meal_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("meal_logs"."user_id" = (select auth.uid())) WITH CHECK ("meal_logs"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "meal_searches: owner full access" ON "meal_searches" AS PERMISSIVE FOR ALL TO "authenticated" USING ("meal_searches"."user_id" = (select auth.uid())) WITH CHECK ("meal_searches"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "menu_components: signed-in read" ON "menu_components" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "menu_items: signed-in read" ON "menu_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "order_events: order owner read" ON "order_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from orders o where o.id = "order_events"."order_id" and o.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "order_items: order owner read" ON "order_items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from orders o where o.id = "order_items"."order_id" and o.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "orders: owner read" ON "orders" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("orders"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "payments: order owner read" ON "payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from orders o where o.id = "payments"."order_id" and o.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "portion_levels: signed-in read" ON "portion_levels" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "profiles: owner full access" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING ("profiles"."id" = (select auth.uid())) WITH CHECK ("profiles"."id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "providers: signed-in read" ON "providers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "restaurants: signed-in read" ON "restaurants" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "weight_logs: owner full access" ON "weight_logs" AS PERMISSIVE FOR ALL TO "authenticated" USING ("weight_logs"."user_id" = (select auth.uid())) WITH CHECK ("weight_logs"."user_id" = (select auth.uid()));