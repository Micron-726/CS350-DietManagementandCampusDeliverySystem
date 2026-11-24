import type { ActivityLevel, GoalMode, Sex } from "./goals";

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

export const kcalNumber = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });
