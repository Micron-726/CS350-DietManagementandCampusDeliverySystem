import type { ActivityLevel, BodyProfile, GoalMode, Sex, TargetSource } from "./goals";
import type { MealType } from "./meals";

export const sexLabels: Record<Sex, string> = { male: "남성", female: "여성" };

export const activityLabels: Record<ActivityLevel, { label: string; description: string }> = {
  sedentary: { label: "거의 활동 안 함", description: "주로 앉아서 생활, 운동 거의 안 함" },
  light: { label: "가벼운 활동", description: "주 1~3회 가벼운 운동" },
  moderate: { label: "보통 활동", description: "주 3~5회 운동" },
  active: { label: "활발한 활동", description: "주 6~7회 운동" },
  very_active: { label: "매우 활발한 활동", description: "매일 고강도 운동 또는 육체노동" },
};

export const goalModeLabels: Record<GoalMode, string> = {
  deficit: "감량",
  maintenance: "유지",
  surplus: "증량",
};

export const profileFieldLabels: Record<keyof BodyProfile, string> = {
  heightCm: "키",
  weightKg: "체중",
  age: "나이",
  sex: "성별",
  activityLevel: "활동량",
};

export const targetSourceLabels: Record<TargetSource, string> = { calculated: "추천값", custom: "직접 입력" };

export const mealTypeLabels: Record<MealType, string> = { breakfast: "아침", lunch: "점심", dinner: "저녁", snack: "간식" };

export const kcalNumber = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
/** Logged values may have one decimal (12.5 g). */
export const nutrientNumber = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

const dayFormat = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "Asia/Seoul" });
/** "2026-11-25" → "11월 25일" */
export function dayLabel(date: string) {
  return dayFormat.format(new Date(`${date}T12:00:00+09:00`));
}
