import type { HoofPosition } from "./types";

/** 本地存储键 */
export const STORAGE_KEY = "farrier-archive-v1";

/** 四蹄定义：顺序即录入与展示顺序 */
export const HOOF_ORDER: HoofPosition[] = ["LF", "RF", "LH", "RH"];

export const HOOF_LABELS: Record<HoofPosition, string> = {
  LF: "左前蹄",
  RF: "右前蹄",
  LH: "左后蹄",
  RH: "右后蹄",
};

/** 左右对比蹄对 */
export const HOOF_PAIRS: { key: string; label: string; left: HoofPosition; right: HoofPosition }[] = [
  { key: "front", label: "前蹄", left: "LF", right: "RF" },
  { key: "hind", label: "后蹄", left: "LH", right: "RH" },
];

/** 蹄形评估选项 */
export const SHAPE_OPTIONS = ["形态正常", "外侧磨耗", "内侧磨耗", "蹄裂", "蹄壁薄弱", "蹄底瘀伤", "角质过长", "角壁缺损"];

/** 蹄铁类型选项 */
export const SHOE_OPTIONS = ["未钉蹄铁", "普通钢蹄铁", "铝蹄铁", "加护蹄垫", "蹄唇蹄铁", "矫正蹄铁", "树脂蹄铁"];

export const USAGE_OPTIONS = ["运动马", "休养马"] as const;

/** 复查提醒原因文案 */
export const REASON = {
  GAIT: "步态异常",
  PAIR: "左右蹄评估不一致",
} as const;

/** 今天，格式 YYYY-MM-DD（本地时区） */
export function today(): string {
  return toDateInput(new Date());
}

export function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 在某天基础上加减天数 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

/** 日期显示：2026-09-26 -> 2026/09/26 */
export function fmtDate(dateStr: string): string {
  if (!dateStr) return "—";
  return dateStr.replace(/-/g, "/");
}

/** 距离下次复查还有几天（负数=已逾期） */
export function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr + "T00:00:00").getTime();
  const now = new Date(today() + "T00:00:00").getTime();
  return Math.round((target - now) / 86400000);
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
