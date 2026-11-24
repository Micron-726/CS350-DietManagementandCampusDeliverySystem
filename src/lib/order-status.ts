import type { deliveries, orders, payments } from "@/db/schema";

type OrderStatus = (typeof orders.$inferSelect)["status"];
type DeliveryStatus = (typeof deliveries.$inferSelect)["status"];
type PaymentStatus = (typeof payments.$inferSelect)["status"];
type Fulfillment = (typeof orders.$inferSelect)["fulfillmentType"];

export const orderLabels: Record<OrderStatus, string> = {
  pending: "접수 중", submitted: "가게 확인 대기", confirmed: "주문 수락", failed: "주문 실패", cancelled: "취소", completed: "완료",
};
export const deliveryLabels: Record<DeliveryStatus, string> = {
  pending: "준비 대기", preparing: "준비 중", ready_for_pickup: "픽업 대기", in_transit: "배달 중",
  delivered: "전달 완료", cancelled: "취소", failed: "배달 실패",
};
export const paymentLabels: Record<PaymentStatus, string> = {
  pending: "결제 대기", authorized: "결제 승인", paid: "결제 완료", failed: "결제 실패", cancelled: "결제 취소", refunded: "환불 완료",
};

export const transitions = {
  accept: "주문 수락", reject: "주문 거절", dispatch: "배달 시작", ready: "픽업 준비 완료", complete: "전달 완료",
};
export type Transition = keyof typeof transitions;

export function orderActions(status: OrderStatus, delivery: DeliveryStatus | null, fulfillment: Fulfillment): Transition[] {
  if (status === "submitted" && delivery === "pending") return ["accept", "reject"];
  if (status !== "confirmed") return [];
  if (delivery === "preparing") return [fulfillment === "delivery" ? "dispatch" : "ready"];
  if (delivery === "in_transit" || delivery === "ready_for_pickup") return ["complete"];
  return [];
}

export const demoPaymentMethod = "demo";
