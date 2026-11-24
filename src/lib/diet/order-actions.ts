"use server";

import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { isUuid } from "@/lib/menu";
import { dietClient } from "./data";
import { orderLogEntry } from "./order-log";
import { loadOrderForLog } from "./order-data";

export type OrderLogState = { status: "idle" | "added" | "exists" | "error"; message: string | null; date: string | null };

/**
 * FR-15: add a confirmed order to the food log as ONE entry. Double clicks and retries are safe:
 * the unique index on meal_logs.order_item_id lets only one entry per order exist.
 */
export async function addOrderToLog(orderId: string): Promise<OrderLogState> {
  const account = await requireAccount("customer");
  if (!isUuid(orderId)) return { status: "error", message: "주문을 찾을 수 없습니다.", date: null };

  const order = await loadOrderForLog(account.id, orderId);
  if (!order) return { status: "error", message: "주문을 찾을 수 없습니다.", date: null };
  const entry = orderLogEntry({
    restaurantName: order.restaurant.name, status: order.status,
    confirmedAt: order.confirmedAt, createdAt: order.createdAt, items: order.items,
  });
  if (!entry.ok) {
    return {
      status: "error",
      message: entry.reason === "not_confirmed" ? "가게가 수락한 주문만 식사 기록에 추가할 수 있습니다." : "주문한 메뉴 정보가 없어 추가할 수 없습니다.",
      date: null,
    };
  }

  const { name, eatenAt, linkItemId, kcal, protein } = entry.value;
  const date = dateInKorea(eatenAt);
  const supabase = await dietClient();
  const { error } = await supabase.from("meal_logs").insert({
    user_id: account.id,
    log_date: date,
    eaten_at: eatenAt.toISOString(),
    name,
    kcal: kcal.value,
    kcal_source: kcal.source,
    protein_g: protein.value,
    protein_source: protein.source,
    source: "order",
    order_item_id: linkItemId,
  });
  if (error?.code === "23505") {
    // Already logged (double click, or another tab). Report where it is.
    const { data } = await supabase.from("meal_logs").select("log_date").eq("user_id", account.id).eq("order_item_id", linkItemId).maybeSingle();
    return { status: "exists", message: null, date: data?.log_date ?? date };
  }
  if (error) {
    console.error("addOrderToLog failed", error);
    return { status: "error", message: "식사 기록에 추가하지 못했습니다. 잠시 후 다시 시도해 주세요.", date: null };
  }

  revalidatePath("/orders");
  revalidatePath("/diary");
  revalidatePath("/");
  return { status: "added", message: null, date };
}
