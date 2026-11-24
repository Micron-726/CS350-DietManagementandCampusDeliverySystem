/**
 * Diet Management & Campus Delivery System — Drizzle schema (Supabase / Postgres)
 * Based on Team 12 SRS (2026-10-07).
 *
 * Conventions
 * - Column names are generated as snake_case (casing: "snake_case" in drizzle.config.ts and db.ts).
 * - Stored units are fixed (NFR-15): energy = kcal, protein = g, money = KRW (integer),
 *   distance = m, body weight = kg, height = cm. Display units are a per-user preference
 *   (`profiles.unit_prefs`); convert for display only.
 * - Nutrition values are nullable: null = unknown (FR-13). Each nutrition value has its own
 *   source label — `kcal_source` / `protein_source` (IR-05, OR-03). A value labelled
 *   "unavailable" must be null (enforced by check constraints).
 * - `updated_at` is set by a database trigger (moddatetime), so it is correct for writes from
 *   both Drizzle and supabase-js. See the `triggers` migration.
 *
 * Access model (RLS)
 * - PERSONAL tables (profile, goals, logs, orders…): only the owner can see them (NFR-05).
 * - GLOBAL catalog tables (providers, restaurants, menus, portions): any signed-in user can read;
 *   writes only from server code (provider sync jobs) using the direct DB connection.
 * - Orders are READ-ONLY for users: the server creates/updates them after talking to the
 *   provider (FR-34, NFR-06), so a client can never mark its own order as "confirmed".
 * - integration_logs: RLS on, no policies → server only.
 */
import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

/* ───────────────────────────── Enums ───────────────────────────── */

/**
 * Account type (NFR-05). Set once by the `handle_new_user` trigger and never by the user:
 * - customer: KAIST member, self sign-up with an @kaist.ac.kr email (FR-01)
 * - restaurant: store account, created by an admin (`app_metadata.role = 'restaurant'`)
 */
export const accountRoleEnum = pgEnum("account_role", ["customer", "restaurant"]);

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);
export const goalModeEnum = pgEnum("goal_mode", ["deficit", "maintenance", "surplus"]); // FR-06
export const targetSourceEnum = pgEnum("target_source", ["calculated", "custom"]); // FR-04/05

/** Where a nutrition number came from (IR-05, OR-03). `user` = typed in by the user. */
export const nutritionSourceEnum = pgEnum("nutrition_source", [
  "provider",
  "calculated",
  "estimated",
  "user",
  "unavailable",
]);

export const mealLogSourceEnum = pgEnum("meal_log_source", ["manual", "menu", "order"]);
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);

export const providerKindEnum = pgEnum("provider_kind", ["restaurant", "delivery", "aggregator"]);

/** FR-28 component list */
export const componentTypeEnum = pgEnum("component_type", [
  "rice",
  "meat",
  "sauce",
  "dessert",
  "tofu",
  "topping",
  "egg",
  "bread",
  "other",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending", //   created locally, not sent yet
  "submitted", // sent to provider, waiting for confirmation
  "confirmed", // provider confirmed (FR-34) — only now counts as successful
  "failed", //    provider rejected / API error (FR-36, NFR-09)
  "cancelled",
  "completed", // delivered / picked up
]);
export const fulfillmentTypeEnum = pgEnum("fulfillment_type", ["delivery", "pickup"]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "preparing",
  "ready_for_pickup",
  "in_transit",
  "delivered",
  "cancelled",
  "failed",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "authorized",
  "paid",
  "failed",
  "cancelled",
  "refunded",
]);

/* ───────────────────────────── Helpers ───────────────────────────── */

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
/** Bumped by the `set_updated_at` trigger on every UPDATE (any client). Don't set it by hand. */
const updatedAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

/** Owner column for personal tables. Defaults to the caller's id when inserted through supabase-js. */
const ownerId = () =>
  uuid()
    .notNull()
    .default(sql`auth.uid()`)
    .references(() => authUsers.id, { onDelete: "cascade" });

/** Plain coordinates (WGS84) — easy to read/write from both Drizzle and supabase-js. */
const latLng = () => ({ lat: doublePrecision(), lng: doublePrecision() });

/** A nutrition value labelled "unavailable" must be empty (IR-05, OR-03/04). */
const unavailableMeansNull = (name: string, source: AnyPgColumn, value: AnyPgColumn) =>
  check(name, sql`${source} <> 'unavailable' or ${value} is null`);

/** Owner can do everything with their own rows. */
const ownerAll = (table: string, userId: AnyPgColumn) =>
  pgPolicy(`${table}: owner full access`, {
    for: "all",
    to: authenticatedRole,
    using: sql`${userId} = ${authUid}`,
    withCheck: sql`${userId} = ${authUid}`,
  });

/** Owner can only read (writes happen on the server). */
const ownerRead = (table: string, userId: AnyPgColumn) =>
  pgPolicy(`${table}: owner read`, {
    for: "select",
    to: authenticatedRole,
    using: sql`${userId} = ${authUid}`,
  });

/** Read access for child rows of an order the caller owns. */
const orderOwnerRead = (table: string, orderId: AnyPgColumn) =>
  pgPolicy(`${table}: order owner read`, {
    for: "select",
    to: authenticatedRole,
    using: sql`exists (select 1 from orders o where o.id = ${orderId} and o.user_id = ${authUid})`,
  });

/** Global catalog: any signed-in user can read. */
const signedInRead = (table: string) =>
  pgPolicy(`${table}: signed-in read`, {
    for: "select",
    to: authenticatedRole,
    using: sql`true`,
  });

/* ═════════════════════ PERSONAL: user, goals, logs ═════════════════════ */

/** 1:1 with auth.users (KAIST login via Supabase Auth, FR-01). DR "User", FR-02. */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid()
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    /** Read-only for the user: excluded from the column-level UPDATE grant (`account` migration). */
    role: accountRoleEnum().notNull().default("customer"),
    displayName: text(),
    heightCm: real(),
    /** Current weight used for target calculation. History lives in weight_logs. */
    weightKg: real(),
    /** Years, as entered by the user (FR-02, DR "User"). */
    age: smallint(),
    sex: sexEnum(),
    activityLevel: activityLevelEnum(),
    /** Display units (NFR-15). Stored values stay in base units. */
    unitPrefs: jsonb()
      .$type<UnitPrefs>()
      .notNull()
      .default({ energy: "kcal", weight: "kg", height: "cm", distance: "km" }),
    timezone: text().notNull().default("Asia/Seoul"),
    /** Optional saved location for distance search, e.g. dorm (IR-08). */
    defaultLocationLabel: text(),
    defaultLat: doublePrecision(),
    defaultLng: doublePrecision(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    ownerAll("profiles", t.id),
    check("profiles_height_range", sql`${t.heightCm} is null or ${t.heightCm} between 50 and 300`),
    check("profiles_weight_range", sql`${t.weightKg} is null or ${t.weightKg} between 20 and 400`),
    check("profiles_age_range", sql`${t.age} is null or ${t.age} between 10 and 120`),
    // NFR-07: profiles are written from the client, so validate the unit choices here too
    check(
      "profiles_unit_prefs_valid",
      sql`${t.unitPrefs}->>'energy' in ('kcal', 'kJ')
      and ${t.unitPrefs}->>'weight' in ('kg', 'lb')
      and ${t.unitPrefs}->>'height' in ('cm', 'in')
      and ${t.unitPrefs}->>'distance' in ('m', 'km', 'mi')`,
    ),
  ],
);

/**
 * Daily targets, versioned by date so past dashboards use the goal that applied then (FR-11).
 * Goal for day D = row with the latest effective_from <= D.
 */
export const dietGoals = pgTable(
  "diet_goals",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    effectiveFrom: date({ mode: "string" }).notNull(),
    goalMode: goalModeEnum().notNull().default("maintenance"), // FR-06
    adjustmentKcal: smallint().notNull().default(0), // FR-07: 0 | 100 | 200 | 300 | 400
    /** What the system calculated from the profile (FR-04), kept even if the user overrides. */
    recommendedKcal: real(),
    calorieTargetKcal: real().notNull(),
    calorieTargetSource: targetSourceEnum().notNull().default("calculated"), // FR-05
    recommendedProteinG: real(),
    proteinTargetG: real().notNull(),
    proteinTargetSource: targetSourceEnum().notNull().default("calculated"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("diet_goals_user_date_uq").on(t.userId, t.effectiveFrom),
    check(
      "diet_goals_adjustment",
      sql`(${t.goalMode} = 'maintenance' and ${t.adjustmentKcal} = 0)
       or (${t.goalMode} <> 'maintenance' and ${t.adjustmentKcal} in (100, 200, 300, 400))`,
    ),
    check("diet_goals_targets_positive", sql`${t.calorieTargetKcal} > 0 and ${t.proteinTargetG} >= 0`),
    ownerAll("diet_goals", t.userId),
  ],
);

/** Food log (FR-12..15). Manual entries, menu picks, or meals from a confirmed order. */
export const mealLogs = pgTable(
  "meal_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    /** Calendar day in the user's timezone — set by the app; used for dashboard grouping. */
    logDate: date({ mode: "string" }).notNull(),
    eatenAt: timestamp({ withTimezone: true }).notNull(),
    mealType: mealTypeEnum(),
    name: text().notNull(),
    kcal: real(), // null = unknown (FR-13)
    kcalSource: nutritionSourceEnum().notNull().default("user"),
    proteinG: real(),
    proteinSource: nutritionSourceEnum().notNull().default("user"),
    source: mealLogSourceEnum().notNull().default("manual"),
    menuItemId: uuid().references(() => menuItems.id, { onDelete: "set null" }),
    orderItemId: uuid().references(() => orderItems.id, { onDelete: "set null" }),
    /** Portion choices if logged from a menu/order: [{ component, level, label }] */
    portions: jsonb().$type<PortionSnapshot[]>(),
    note: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("meal_logs_user_date_idx").on(t.userId, t.logDate),
    // an ordered meal can be auto-logged only once (FR-15)
    uniqueIndex("meal_logs_order_item_uq").on(t.orderItemId).where(sql`${t.orderItemId} is not null`),
    check(
      "meal_logs_nutrition_nonneg",
      sql`(${t.kcal} is null or ${t.kcal} >= 0) and (${t.proteinG} is null or ${t.proteinG} >= 0)`,
    ),
    unavailableMeansNull("meal_logs_kcal_unavailable_null", t.kcalSource, t.kcal),
    unavailableMeansNull("meal_logs_protein_unavailable_null", t.proteinSource, t.proteinG),
    ownerAll("meal_logs", t.userId),
  ],
);

/** Weight log (FR-16..18). */
export const weightLogs = pgTable(
  "weight_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    recordedAt: timestamp({ withTimezone: true }).notNull(),
    weightKg: real().notNull(),
    note: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("weight_logs_user_time_idx").on(t.userId, t.recordedAt),
    check("weight_logs_range", sql`${t.weightKg} between 20 and 400`),
    ownerAll("weight_logs", t.userId),
  ],
);

/**
 * Search history (DR "Search Query"). The user's location is deliberately NOT stored —
 * only the distance limit (NFR-08). Drop this table if you don't need history/analytics.
 */
export const mealSearches = pgTable(
  "meal_searches",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: ownerId(),
    targetKcal: real(),
    targetProteinG: real(),
    maxPriceKrw: integer(),
    maxDistanceM: integer(),
    resultCount: integer(),
    createdAt: createdAt(),
  },
  (t) => [
    index("meal_searches_user_time_idx").on(t.userId, t.createdAt),
    check("meal_searches_has_target", sql`${t.targetKcal} is not null or ${t.targetProteinG} is not null`), // FR-19
    ownerAll("meal_searches", t.userId),
  ],
);

/* ═════════════════ GLOBAL CATALOG: providers, stores, menus ═════════════════ */

/**
 * External restaurant / delivery services (NFR-19, OR-05: add providers without touching diet tables).
 * API keys/secrets do NOT go here — keep them in env vars or Supabase Vault (NFR-06).
 */
export const providers = pgTable(
  "providers",
  {
    id: uuid().primaryKey().defaultRandom(),
    code: text().notNull().unique(), // e.g. "kaist_cafeteria", "baemin"
    name: text().notNull(),
    kind: providerKindEnum().notNull(),
    supportsOrdering: boolean().notNull().default(false), // FR-37
    supportsDelivery: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    /** Non-secret settings: base URL, rate limits, supported area… */
    config: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  () => [signedInRead("providers")],
);

/** Stores / restaurants (DR "Restaurant"). One row per (provider, store). */
export const restaurants = pgTable(
  "restaurants",
  {
    id: uuid().primaryKey().defaultRandom(),
    providerId: uuid()
      .notNull()
      .references(() => providers.id, { onDelete: "restrict" }),
    externalId: text().notNull(), // provider's store id
    /** Store account that manages this restaurant (profiles.role = 'restaurant'). null = none. */
    ownerId: uuid().references(() => authUsers.id, { onDelete: "set null" }),
    name: text().notNull(),
    description: text(),
    address: text(),
    campusArea: text(), // e.g. "N11", "W2" — handy on campus
    ...latLng(), // null = unknown → excluded from distance-filtered search (FR-22)
    /*
     * `geo extensions.geography(Point, 4326)` — generated from lat/lng, GIST-indexed — lives in
     * the `postgis` migration, NOT here: drizzle-kit can't emit a schema-qualified custom type,
     * and the hosted DB doesn't have `extensions` on the migration search_path. Drizzle ignores
     * the column. Distance search (FR-22) uses raw SQL, e.g.
     *   sql`extensions.st_dwithin(${restaurants}.geo, extensions.st_makepoint(${lng}, ${lat})::extensions.geography, ${meters})`
     */
    imageUrl: text(),
    /** Opening hours as the provider sends them, normalized by the sync job. */
    openingHours: jsonb().$type<OpeningHours>(),
    acceptingOrders: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    lastSyncedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("restaurants_provider_external_uq").on(t.providerId, t.externalId),
    index("restaurants_owner_idx").on(t.ownerId),
    signedInRead("restaurants"),
  ],
);

/** Menu item = base meal (DR "Menu Item", FR-28). Totals = base + selected portion deltas (FR-31). */
export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    externalId: text().notNull(),
    name: text().notNull(),
    description: text(),
    category: text(),
    imageUrl: text(),
    basePriceKrw: integer(), // null when the provider has not published a price
    serviceDate: date(), // date of a rotating menu (Korea time); null for regular catalog items
    sourceUrl: text(),
    baseKcal: real(),
    kcalSource: nutritionSourceEnum().notNull().default("unavailable"), // IR-05
    baseProteinG: real(),
    /** FR-27: "exact match" only when both sources are "provider". */
    proteinSource: nutritionSourceEnum().notNull().default("unavailable"),
    /** Optional extra nutrients when a provider has them (not all do — design constraint). */
    extraNutrition: jsonb().$type<ExtraNutrition>(),
    isAvailable: boolean().notNull().default(true),
    lastSyncedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("menu_items_restaurant_external_uq").on(t.restaurantId, t.externalId),
    index("menu_items_restaurant_idx").on(t.restaurantId),
    index("menu_items_restaurant_service_date_idx").on(t.restaurantId, t.serviceDate),
    index("menu_items_kcal_protein_idx").on(t.baseKcal, t.baseProteinG),
    index("menu_items_price_idx").on(t.basePriceKrw),
    check("menu_items_price_nonneg", sql`${t.basePriceKrw} >= 0`),
    unavailableMeansNull("menu_items_kcal_unavailable_null", t.kcalSource, t.baseKcal),
    unavailableMeansNull("menu_items_protein_unavailable_null", t.proteinSource, t.baseProteinG),
    signedInRead("menu_items"),
  ],
);

/** Configurable component of a meal: rice, meat, sauce… (DR "Meal Component", FR-28). */
export const menuComponents = pgTable(
  "menu_components",
  {
    id: uuid().primaryKey().defaultRandom(),
    menuItemId: uuid()
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    type: componentTypeEnum().notNull(),
    name: text().notNull(), // display label, e.g. "Brown rice"
    externalId: text(),
    sortOrder: smallint().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("menu_components_menu_idx").on(t.menuItemId), signedInRead("menu_components")],
);

/**
 * Portion levels for a component = slider stops (FR-29). Show a slider only when a component
 * has 2+ levels. Deltas are relative to the menu item's base values.
 */
export const portionLevels = pgTable(
  "portion_levels",
  {
    id: uuid().primaryKey().defaultRandom(),
    componentId: uuid()
      .notNull()
      .references(() => menuComponents.id, { onDelete: "cascade" }),
    level: smallint().notNull(), // slider order: 0 = none/least
    label: text().notNull(), // "None", "Less", "Regular", "Extra"
    externalOptionId: text(), // provider option id sent back when ordering (FR-33)
    isDefault: boolean().notNull().default(false),
    priceDeltaKrw: integer().notNull().default(0),
    kcalDelta: real(), // null = unknown
    kcalSource: nutritionSourceEnum().notNull().default("unavailable"),
    proteinDeltaG: real(),
    proteinSource: nutritionSourceEnum().notNull().default("unavailable"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("portion_levels_component_level_uq").on(t.componentId, t.level),
    uniqueIndex("portion_levels_one_default_uq").on(t.componentId).where(sql`${t.isDefault}`),
    unavailableMeansNull("portion_levels_kcal_unavailable_null", t.kcalSource, t.kcalDelta),
    unavailableMeansNull("portion_levels_protein_unavailable_null", t.proteinSource, t.proteinDeltaG),
    signedInRead("portion_levels"),
  ],
);

/* ═════════════════ PERSONAL (server-written): orders, payment, delivery ═════════════════ */

/** DR "Order". Created/updated by the server only. */
export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    providerId: uuid()
      .notNull()
      .references(() => providers.id, { onDelete: "restrict" }),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id, { onDelete: "restrict" }),
    /** Client-generated per checkout attempt; retries reuse it → no duplicate orders (NFR-03). */
    idempotencyKey: text().notNull().unique(),
    providerOrderId: text(), // shown to user on success (FR-35)
    status: orderStatusEnum().notNull().default("pending"),
    fulfillmentType: fulfillmentTypeEnum().notNull().default("delivery"),
    totalPriceKrw: integer().notNull(),
    totalKcal: real(),
    totalProteinG: real(),
    failureReason: text(), // user-visible cause (FR-36, NFR-17)
    submittedAt: timestamp({ withTimezone: true }),
    confirmedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("orders_provider_order_uq").on(t.providerId, t.providerOrderId),
    index("orders_user_time_idx").on(t.userId, t.createdAt),
    // FR-34: success only with a provider confirmation
    check(
      "orders_confirmed_has_provider_id",
      sql`${t.status} not in ('confirmed', 'completed') or ${t.providerOrderId} is not null`,
    ),
    check("orders_total_nonneg", sql`${t.totalPriceKrw} >= 0`),
    ownerRead("orders", t.userId),
  ],
);

/**
 * Line items with a SNAPSHOT of what was ordered (menus change after the fact).
 * `portions` = selected meal configuration (DR "Order", FR-33).
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: uuid().references(() => menuItems.id, { onDelete: "set null" }),
    name: text().notNull(),
    quantity: smallint().notNull().default(1),
    unitPriceKrw: integer().notNull(), // base + portion deltas
    kcal: real(), // per unit, base + deltas
    kcalSource: nutritionSourceEnum().notNull(),
    proteinG: real(),
    proteinSource: nutritionSourceEnum().notNull(),
    portions: jsonb().$type<PortionSnapshot[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_pos", sql`${t.quantity} > 0`),
    unavailableMeansNull("order_items_kcal_unavailable_null", t.kcalSource, t.kcal),
    unavailableMeansNull("order_items_protein_unavailable_null", t.proteinSource, t.proteinG),
    orderOwnerRead("order_items", t.orderId),
  ],
);

/**
 * Payment record mirrored from the provider. The app never handles card data — payment runs on
 * the provider side (SRS: payment infrastructure out of scope). Store references/status only.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    providerPaymentRef: text(),
    method: text(), // label from provider, e.g. "card", "kakaopay"
    amountKrw: integer().notNull(),
    status: paymentStatusEnum().notNull().default("pending"),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("payments_order_idx").on(t.orderId), orderOwnerRead("payments", t.orderId)],
);

/** Delivery / pickup status mirrored from the provider (no driver management — out of scope). */
export const deliveries = pgTable(
  "deliveries",
  {
    orderId: uuid()
      .primaryKey()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: deliveryStatusEnum().notNull().default("pending"),
    addressLabel: text(), // e.g. "N14 Sarang Hall, lobby"
    ...latLng(),
    requestNote: text(),
    trackingUrl: text(),
    etaAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [orderOwnerRead("deliveries", t.orderId)],
);

/** Timeline of status changes (order / payment / delivery) from webhooks or polling. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: text().notNull(), // 'order' | 'payment' | 'delivery'
    status: text().notNull(),
    source: text().notNull(), // 'provider_webhook' | 'polling' | 'system'
    message: text(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("order_events_order_time_idx").on(t.orderId, t.occurredAt),
    check("order_events_kind", sql`${t.kind} in ('order', 'payment', 'delivery')`),
    orderOwnerRead("order_events", t.orderId),
  ],
);

/* ═════════════════ SYSTEM (server only) ═════════════════ */

/** Integration logs for failed/slow provider calls (NFR-20). Never log tokens or personal data. */
export const integrationLogs = pgTable("integration_logs", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  providerId: uuid().references(() => providers.id, { onDelete: "set null" }),
  orderId: uuid().references(() => orders.id, { onDelete: "set null" }),
  operation: text().notNull(), // 'menu_sync' | 'create_order' | 'order_status' | …
  success: boolean().notNull(),
  httpStatus: smallint(),
  errorCode: text(),
  errorMessage: text(),
  durationMs: integer(),
  createdAt: createdAt(),
}).enableRLS(); // RLS on with zero policies → invisible to anon/authenticated

/* ───────────────────────────── JSON types ───────────────────────────── */

export type PortionSnapshot = {
  componentId?: string;
  portionLevelId?: string;
  componentType: (typeof componentTypeEnum.enumValues)[number];
  componentName: string;
  level: number;
  label: string;
  priceDeltaKrw: number;
  kcalDelta: number | null;
  proteinDeltaG: number | null;
};

/** Display-unit preference (NFR-15). Protein is always g, price always KRW. */
export type UnitPrefs = {
  energy: "kcal" | "kJ";
  weight: "kg" | "lb";
  height: "cm" | "in";
  distance: "m" | "km" | "mi";
};

export type ExtraNutrition = {
  carbsG?: number;
  fatG?: number;
  saturatedFatG?: number;
  transFatG?: number;
  sugarG?: number;
  sodiumMg?: number;
  fiberG?: number;
};

/** day 0 = Sunday; times "HH:MM" local */
export type OpeningHours = { day: number; open: string; close: string }[];

/* ───────────────────────────── Relations (for db.query) ───────────────────────────── */

export const profilesRelations = relations(profiles, ({ many }) => ({
  dietGoals: many(dietGoals),
  mealLogs: many(mealLogs),
  weightLogs: many(weightLogs),
  orders: many(orders),
}));

export const dietGoalsRelations = relations(dietGoals, ({ one }) => ({
  profile: one(profiles, { fields: [dietGoals.userId], references: [profiles.id] }),
}));

export const mealLogsRelations = relations(mealLogs, ({ one }) => ({
  profile: one(profiles, { fields: [mealLogs.userId], references: [profiles.id] }),
  menuItem: one(menuItems, { fields: [mealLogs.menuItemId], references: [menuItems.id] }),
  orderItem: one(orderItems, { fields: [mealLogs.orderItemId], references: [orderItems.id] }),
}));

export const weightLogsRelations = relations(weightLogs, ({ one }) => ({
  profile: one(profiles, { fields: [weightLogs.userId], references: [profiles.id] }),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  restaurants: many(restaurants),
  orders: many(orders),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  provider: one(providers, { fields: [restaurants.providerId], references: [providers.id] }),
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [menuItems.restaurantId], references: [restaurants.id] }),
  components: many(menuComponents),
}));

export const menuComponentsRelations = relations(menuComponents, ({ one, many }) => ({
  menuItem: one(menuItems, { fields: [menuComponents.menuItemId], references: [menuItems.id] }),
  levels: many(portionLevels),
}));

export const portionLevelsRelations = relations(portionLevels, ({ one }) => ({
  component: one(menuComponents, {
    fields: [portionLevels.componentId],
    references: [menuComponents.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  profile: one(profiles, { fields: [orders.userId], references: [profiles.id] }),
  provider: one(providers, { fields: [orders.providerId], references: [providers.id] }),
  restaurant: one(restaurants, { fields: [orders.restaurantId], references: [restaurants.id] }),
  items: many(orderItems),
  payments: many(payments),
  delivery: one(deliveries, { fields: [orders.id], references: [deliveries.orderId] }),
  events: many(orderEvents),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  order: one(orders, { fields: [deliveries.orderId], references: [orders.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));