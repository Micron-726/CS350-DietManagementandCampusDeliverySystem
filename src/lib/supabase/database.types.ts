
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "deliveries": {
                  Row: {
                    "address_label": string | null,"created_at": string,"delivered_at": string | null,"eta_at": string | null,"lat": number | null,"lng": number | null,"order_id": string,"request_note": string | null,"status": Database["public"]['Enums']["delivery_status"],"tracking_url": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_label"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"eta_at"?: string | null,"lat"?: number | null,"lng"?: number | null,"order_id": string,"request_note"?: string | null,"status"?: Database["public"]['Enums']["delivery_status"],"tracking_url"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_label"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"eta_at"?: string | null,"lat"?: number | null,"lng"?: number | null,"order_id"?: string,"request_note"?: string | null,"status"?: Database["public"]['Enums']["delivery_status"],"tracking_url"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliveries_order_id_orders_id_fk"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"diet_goals": {
                  Row: {
                    "adjustment_kcal": number,"calorie_target_kcal": number,"calorie_target_source": Database["public"]['Enums']["target_source"],"created_at": string,"effective_from": string,"goal_mode": Database["public"]['Enums']["goal_mode"],"id": string,"protein_target_g": number,"protein_target_source": Database["public"]['Enums']["target_source"],"recommended_kcal": number | null,"recommended_protein_g": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adjustment_kcal"?: number,"calorie_target_kcal": number,"calorie_target_source"?: Database["public"]['Enums']["target_source"],"created_at"?: string,"effective_from": string,"goal_mode"?: Database["public"]['Enums']["goal_mode"],"id"?: string,"protein_target_g": number,"protein_target_source"?: Database["public"]['Enums']["target_source"],"recommended_kcal"?: number | null,"recommended_protein_g"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "adjustment_kcal"?: number,"calorie_target_kcal"?: number,"calorie_target_source"?: Database["public"]['Enums']["target_source"],"created_at"?: string,"effective_from"?: string,"goal_mode"?: Database["public"]['Enums']["goal_mode"],"id"?: string,"protein_target_g"?: number,"protein_target_source"?: Database["public"]['Enums']["target_source"],"recommended_kcal"?: number | null,"recommended_protein_g"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"integration_logs": {
                  Row: {
                    "created_at": string,"duration_ms": number | null,"error_code": string | null,"error_message": string | null,"http_status": number | null,"id": number,"operation": string,"order_id": string | null,"provider_id": string | null,"success": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"duration_ms"?: number | null,"error_code"?: string | null,"error_message"?: string | null,"http_status"?: number | null,"id"?: never,"operation": string,"order_id"?: string | null,"provider_id"?: string | null,"success": boolean
                  }
                  Update: {
                    "created_at"?: string,"duration_ms"?: number | null,"error_code"?: string | null,"error_message"?: string | null,"http_status"?: number | null,"id"?: never,"operation"?: string,"order_id"?: string | null,"provider_id"?: string | null,"success"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "integration_logs_order_id_orders_id_fk"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "integration_logs_provider_id_providers_id_fk"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_logs": {
                  Row: {
                    "created_at": string,"eaten_at": string,"id": string,"kcal": number | null,"kcal_source": Database["public"]['Enums']["nutrition_source"],"log_date": string,"meal_type": Database["public"]['Enums']["meal_type"] | null,"menu_item_id": string | null,"name": string,"note": string | null,"order_item_id": string | null,"portions": Json | null,"protein_g": number | null,"protein_source": Database["public"]['Enums']["nutrition_source"],"source": Database["public"]['Enums']["meal_log_source"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"eaten_at": string,"id"?: string,"kcal"?: number | null,"kcal_source"?: Database["public"]['Enums']["nutrition_source"],"log_date": string,"meal_type"?: Database["public"]['Enums']["meal_type"] | null,"menu_item_id"?: string | null,"name": string,"note"?: string | null,"order_item_id"?: string | null,"portions"?: Json | null,"protein_g"?: number | null,"protein_source"?: Database["public"]['Enums']["nutrition_source"],"source"?: Database["public"]['Enums']["meal_log_source"],"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"eaten_at"?: string,"id"?: string,"kcal"?: number | null,"kcal_source"?: Database["public"]['Enums']["nutrition_source"],"log_date"?: string,"meal_type"?: Database["public"]['Enums']["meal_type"] | null,"menu_item_id"?: string | null,"name"?: string,"note"?: string | null,"order_item_id"?: string | null,"portions"?: Json | null,"protein_g"?: number | null,"protein_source"?: Database["public"]['Enums']["nutrition_source"],"source"?: Database["public"]['Enums']["meal_log_source"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "meal_logs_menu_item_id_menu_items_id_fk"
      columns: ["menu_item_id"]
isOneToOne: false
      referencedRelation: "menu_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "meal_logs_order_item_id_order_items_id_fk"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"meal_searches": {
                  Row: {
                    "created_at": string,"id": string,"max_distance_m": number | null,"max_price_krw": number | null,"result_count": number | null,"target_kcal": number | null,"target_protein_g": number | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"max_distance_m"?: number | null,"max_price_krw"?: number | null,"result_count"?: number | null,"target_kcal"?: number | null,"target_protein_g"?: number | null,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"max_distance_m"?: number | null,"max_price_krw"?: number | null,"result_count"?: number | null,"target_kcal"?: number | null,"target_protein_g"?: number | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"menu_components": {
                  Row: {
                    "created_at": string,"external_id": string | null,"id": string,"menu_item_id": string,"name": string,"sort_order": number,"type": Database["public"]['Enums']["component_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"external_id"?: string | null,"id"?: string,"menu_item_id": string,"name": string,"sort_order"?: number,"type": Database["public"]['Enums']["component_type"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"external_id"?: string | null,"id"?: string,"menu_item_id"?: string,"name"?: string,"sort_order"?: number,"type"?: Database["public"]['Enums']["component_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "menu_components_menu_item_id_menu_items_id_fk"
      columns: ["menu_item_id"]
isOneToOne: false
      referencedRelation: "menu_items"
      referencedColumns: ["id"]
    }
                  ]
                },"menu_items": {
                  Row: {
                    "base_kcal": number | null,"base_price_krw": number,"base_protein_g": number | null,"category": string | null,"created_at": string,"description": string | null,"external_id": string,"extra_nutrition": Json | null,"id": string,"image_url": string | null,"is_available": boolean,"kcal_source": Database["public"]['Enums']["nutrition_source"],"last_synced_at": string | null,"name": string,"protein_source": Database["public"]['Enums']["nutrition_source"],"restaurant_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_kcal"?: number | null,"base_price_krw": number,"base_protein_g"?: number | null,"category"?: string | null,"created_at"?: string,"description"?: string | null,"external_id": string,"extra_nutrition"?: Json | null,"id"?: string,"image_url"?: string | null,"is_available"?: boolean,"kcal_source"?: Database["public"]['Enums']["nutrition_source"],"last_synced_at"?: string | null,"name": string,"protein_source"?: Database["public"]['Enums']["nutrition_source"],"restaurant_id": string,"updated_at"?: string
                  }
                  Update: {
                    "base_kcal"?: number | null,"base_price_krw"?: number,"base_protein_g"?: number | null,"category"?: string | null,"created_at"?: string,"description"?: string | null,"external_id"?: string,"extra_nutrition"?: Json | null,"id"?: string,"image_url"?: string | null,"is_available"?: boolean,"kcal_source"?: Database["public"]['Enums']["nutrition_source"],"last_synced_at"?: string | null,"name"?: string,"protein_source"?: Database["public"]['Enums']["nutrition_source"],"restaurant_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "menu_items_restaurant_id_restaurants_id_fk"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_events": {
                  Row: {
                    "id": number,"kind": string,"message": string | null,"occurred_at": string,"order_id": string,"source": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"kind": string,"message"?: string | null,"occurred_at"?: string,"order_id": string,"source": string,"status": string
                  }
                  Update: {
                    "id"?: never,"kind"?: string,"message"?: string | null,"occurred_at"?: string,"order_id"?: string,"source"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_order_id_orders_id_fk"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "created_at": string,"id": string,"kcal": number | null,"kcal_source": Database["public"]['Enums']["nutrition_source"],"menu_item_id": string | null,"name": string,"order_id": string,"portions": NonNullable<Json>,"protein_g": number | null,"protein_source": Database["public"]['Enums']["nutrition_source"],"quantity": number,"unit_price_krw": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kcal"?: number | null,"kcal_source": Database["public"]['Enums']["nutrition_source"],"menu_item_id"?: string | null,"name": string,"order_id": string,"portions"?: NonNullable<Json>,"protein_g"?: number | null,"protein_source": Database["public"]['Enums']["nutrition_source"],"quantity"?: number,"unit_price_krw": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kcal"?: number | null,"kcal_source"?: Database["public"]['Enums']["nutrition_source"],"menu_item_id"?: string | null,"name"?: string,"order_id"?: string,"portions"?: NonNullable<Json>,"protein_g"?: number | null,"protein_source"?: Database["public"]['Enums']["nutrition_source"],"quantity"?: number,"unit_price_krw"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_menu_item_id_menu_items_id_fk"
      columns: ["menu_item_id"]
isOneToOne: false
      referencedRelation: "menu_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_orders_id_fk"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "confirmed_at": string | null,"created_at": string,"failure_reason": string | null,"fulfillment_type": Database["public"]['Enums']["fulfillment_type"],"id": string,"idempotency_key": string,"provider_id": string,"provider_order_id": string | null,"restaurant_id": string,"status": Database["public"]['Enums']["order_status"],"submitted_at": string | null,"total_kcal": number | null,"total_price_krw": number,"total_protein_g": number | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string | null,"created_at"?: string,"failure_reason"?: string | null,"fulfillment_type"?: Database["public"]['Enums']["fulfillment_type"],"id"?: string,"idempotency_key": string,"provider_id": string,"provider_order_id"?: string | null,"restaurant_id": string,"status"?: Database["public"]['Enums']["order_status"],"submitted_at"?: string | null,"total_kcal"?: number | null,"total_price_krw": number,"total_protein_g"?: number | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "confirmed_at"?: string | null,"created_at"?: string,"failure_reason"?: string | null,"fulfillment_type"?: Database["public"]['Enums']["fulfillment_type"],"id"?: string,"idempotency_key"?: string,"provider_id"?: string,"provider_order_id"?: string | null,"restaurant_id"?: string,"status"?: Database["public"]['Enums']["order_status"],"submitted_at"?: string | null,"total_kcal"?: number | null,"total_price_krw"?: number,"total_protein_g"?: number | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_provider_id_providers_id_fk"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_restaurant_id_restaurants_id_fk"
      columns: ["restaurant_id"]
isOneToOne: false
      referencedRelation: "restaurants"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_krw": number,"created_at": string,"id": string,"method": string | null,"order_id": string,"paid_at": string | null,"provider_payment_ref": string | null,"status": Database["public"]['Enums']["payment_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_krw": number,"created_at"?: string,"id"?: string,"method"?: string | null,"order_id": string,"paid_at"?: string | null,"provider_payment_ref"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Update: {
                    "amount_krw"?: number,"created_at"?: string,"id"?: string,"method"?: string | null,"order_id"?: string,"paid_at"?: string | null,"provider_payment_ref"?: string | null,"status"?: Database["public"]['Enums']["payment_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_order_id_orders_id_fk"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"portion_levels": {
                  Row: {
                    "component_id": string,"created_at": string,"external_option_id": string | null,"id": string,"is_default": boolean,"kcal_delta": number | null,"kcal_source": Database["public"]['Enums']["nutrition_source"],"label": string,"level": number,"price_delta_krw": number,"protein_delta_g": number | null,"protein_source": Database["public"]['Enums']["nutrition_source"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "component_id": string,"created_at"?: string,"external_option_id"?: string | null,"id"?: string,"is_default"?: boolean,"kcal_delta"?: number | null,"kcal_source"?: Database["public"]['Enums']["nutrition_source"],"label": string,"level": number,"price_delta_krw"?: number,"protein_delta_g"?: number | null,"protein_source"?: Database["public"]['Enums']["nutrition_source"],"updated_at"?: string
                  }
                  Update: {
                    "component_id"?: string,"created_at"?: string,"external_option_id"?: string | null,"id"?: string,"is_default"?: boolean,"kcal_delta"?: number | null,"kcal_source"?: Database["public"]['Enums']["nutrition_source"],"label"?: string,"level"?: number,"price_delta_krw"?: number,"protein_delta_g"?: number | null,"protein_source"?: Database["public"]['Enums']["nutrition_source"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "portion_levels_component_id_menu_components_id_fk"
      columns: ["component_id"]
isOneToOne: false
      referencedRelation: "menu_components"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "activity_level": Database["public"]['Enums']["activity_level"] | null,"age": number | null,"created_at": string,"default_lat": number | null,"default_lng": number | null,"default_location_label": string | null,"display_name": string | null,"height_cm": number | null,"id": string,"sex": Database["public"]['Enums']["sex"] | null,"timezone": string,"unit_prefs": NonNullable<Json>,"updated_at": string,"weight_kg": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_level"?: Database["public"]['Enums']["activity_level"] | null,"age"?: number | null,"created_at"?: string,"default_lat"?: number | null,"default_lng"?: number | null,"default_location_label"?: string | null,"display_name"?: string | null,"height_cm"?: number | null,"id": string,"sex"?: Database["public"]['Enums']["sex"] | null,"timezone"?: string,"unit_prefs"?: NonNullable<Json>,"updated_at"?: string,"weight_kg"?: number | null
                  }
                  Update: {
                    "activity_level"?: Database["public"]['Enums']["activity_level"] | null,"age"?: number | null,"created_at"?: string,"default_lat"?: number | null,"default_lng"?: number | null,"default_location_label"?: string | null,"display_name"?: string | null,"height_cm"?: number | null,"id"?: string,"sex"?: Database["public"]['Enums']["sex"] | null,"timezone"?: string,"unit_prefs"?: NonNullable<Json>,"updated_at"?: string,"weight_kg"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"providers": {
                  Row: {
                    "code": string,"config": NonNullable<Json>,"created_at": string,"id": string,"is_active": boolean,"kind": Database["public"]['Enums']["provider_kind"],"name": string,"supports_delivery": boolean,"supports_ordering": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"config"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_active"?: boolean,"kind": Database["public"]['Enums']["provider_kind"],"name": string,"supports_delivery"?: boolean,"supports_ordering"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"config"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["provider_kind"],"name"?: string,"supports_delivery"?: boolean,"supports_ordering"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"restaurants": {
                  Row: {
                    "accepting_orders": boolean,"address": string | null,"campus_area": string | null,"created_at": string,"description": string | null,"external_id": string,"geo": unknown,"id": string,"image_url": string | null,"is_active": boolean,"last_synced_at": string | null,"lat": number | null,"lng": number | null,"name": string,"opening_hours": Json | null,"provider_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepting_orders"?: boolean,"address"?: string | null,"campus_area"?: string | null,"created_at"?: string,"description"?: string | null,"external_id": string,"geo"?: never,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"last_synced_at"?: string | null,"lat"?: number | null,"lng"?: number | null,"name": string,"opening_hours"?: Json | null,"provider_id": string,"updated_at"?: string
                  }
                  Update: {
                    "accepting_orders"?: boolean,"address"?: string | null,"campus_area"?: string | null,"created_at"?: string,"description"?: string | null,"external_id"?: string,"geo"?: never,"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"last_synced_at"?: string | null,"lat"?: number | null,"lng"?: number | null,"name"?: string,"opening_hours"?: Json | null,"provider_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "restaurants_provider_id_providers_id_fk"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "providers"
      referencedColumns: ["id"]
    }
                  ]
                },"weight_logs": {
                  Row: {
                    "created_at": string,"id": string,"note": string | null,"recorded_at": string,"updated_at": string,"user_id": string,"weight_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"recorded_at": string,"updated_at"?: string,"user_id"?: string,"weight_kg": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"recorded_at"?: string,"updated_at"?: string,"user_id"?: string,"weight_kg"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "activity_level": "sedentary"|"light"|"moderate"|"active"|"very_active","component_type": "rice"|"meat"|"sauce"|"dessert"|"tofu"|"topping"|"egg"|"bread"|"other","delivery_status": "pending"|"preparing"|"ready_for_pickup"|"in_transit"|"delivered"|"cancelled"|"failed","fulfillment_type": "delivery"|"pickup","goal_mode": "deficit"|"maintenance"|"surplus","meal_log_source": "manual"|"menu"|"order","meal_type": "breakfast"|"lunch"|"dinner"|"snack","nutrition_source": "provider"|"calculated"|"estimated"|"user"|"unavailable","order_status": "pending"|"submitted"|"confirmed"|"failed"|"cancelled"|"completed","payment_status": "pending"|"authorized"|"paid"|"failed"|"cancelled"|"refunded","provider_kind": "restaurant"|"delivery"|"aggregator","sex": "male"|"female","target_source": "calculated"|"custom"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "activity_level": ["sedentary", "light", "moderate", "active", "very_active"],"component_type": ["rice", "meat", "sauce", "dessert", "tofu", "topping", "egg", "bread", "other"],"delivery_status": ["pending", "preparing", "ready_for_pickup", "in_transit", "delivered", "cancelled", "failed"],"fulfillment_type": ["delivery", "pickup"],"goal_mode": ["deficit", "maintenance", "surplus"],"meal_log_source": ["manual", "menu", "order"],"meal_type": ["breakfast", "lunch", "dinner", "snack"],"nutrition_source": ["provider", "calculated", "estimated", "user", "unavailable"],"order_status": ["pending", "submitted", "confirmed", "failed", "cancelled", "completed"],"payment_status": ["pending", "authorized", "paid", "failed", "cancelled", "refunded"],"provider_kind": ["restaurant", "delivery", "aggregator"],"sex": ["male", "female"],"target_source": ["calculated", "custom"]
          }
        }
} as const
