import { HOOF_PAIRS, REASON } from "./constants";
import type { Horse, HoofEntry, HoofPosition, TrimRecord } from "./types";

/** 找出左右形态评估不一致的蹄对名称 */
export function mismatchedPairs(hooves: Record<HoofPosition, HoofEntry>): string[] {
  const result: string[] = [];
  for (const pair of HOOF_PAIRS) {
    const l = hooves[pair.left]?.shape;
    const r = hooves[pair.right]?.shape;
    if (l && r && l !== r) {
      result.push(pair.label);
    }
  }
  return result;
}

/**
 * 计算本次记录自动进入复查提醒的原因。
 * 规则：任一步态异常 或 左右蹄形态评估不一致。
 * 返回空数组表示正常记录，不占提醒名额。
 */
export function detectReasons(gaitAbnormal: boolean, hooves: Record<HoofPosition, HoofEntry>): string[] {
  const reasons: string[] = [];
  if (gaitAbnormal) reasons.push(REASON.GAIT);
  const pairs = mismatchedPairs(hooves);
  if (pairs.length > 0) {
    reasons.push(`${REASON.PAIR}（${pairs.join("、")}）`);
  }
  return reasons;
}

/** 某条记录自身是否还在复查名额中（有原因、未写结论） */
export function isOpenRecord(r: TrimRecord): boolean {
  return r.reasons.length > 0 && !r.conclusion.trim();
}

/**
 * 判断记录是否仍占提醒名额：自身未完成 且 尚未被任何复查记录关联关闭。
 */
export function isOpen(r: TrimRecord, all: TrimRecord[] = []): boolean {
  if (!isOpenRecord(r)) return false;
  if (all.length === 0) return true;
  return !all.some((x) => x.resolvesRecordId === r.id);
}

/** 该记录是否有过步态异常（历史上） */
export function hasGaitIssue(r: TrimRecord): boolean {
  return r.gait.abnormal;
}

/** 某马的记录，按时间倒序 */
export function recordsOf(records: TrimRecord[], horseId: string): TrimRecord[] {
  return records
    .filter((r) => r.horseId === horseId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}

/** 某马当前待复查记录 */
export function openRecordsOf(records: TrimRecord[], horseId: string): TrimRecord[] {
  return recordsOf(records, horseId).filter((r) => isOpen(r, records));
}

export interface HorseStatus {
  horse: Horse;
  open: TrimRecord[];
  hasGait: boolean;
  latest?: TrimRecord;
  total: number;
}

export function horseStatuses(horses: Horse[], records: TrimRecord[]): HorseStatus[] {
  return horses
    .map((horse) => {
      const list = recordsOf(records, horse.id);
      return {
        horse,
        open: list.filter((r) => isOpen(r, records)),
        hasGait: list.some(hasGaitIssue),
        latest: list[0],
        total: list.length,
      };
    })
    .sort((a, b) => {
      // 有待复查的排前面，再按最近修蹄日期
      if (b.open.length !== a.open.length) return b.open.length - a.open.length;
      return (b.latest?.createdAt ?? 0) - (a.latest?.createdAt ?? 0);
    });
}

/** 全部待复查记录（提醒面板用），按下次复查日期升序，逾期在前 */
export function allOpenRecords(records: TrimRecord[]): TrimRecord[] {
  return records
    .filter((r) => isOpen(r, records))
    .sort((a, b) => {
      if (a.nextCheckDate !== b.nextCheckDate) return a.nextCheckDate < b.nextCheckDate ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
}

/** 某马的蹄铁更换历史：同一蹄位相邻记录蹄铁类型发生变化 */
export interface ShoeChange {
  date: string;
  position: HoofPosition;
  from: string;
  to: string;
  recordId: string;
}

export function shoeChanges(records: TrimRecord[], horseId: string): ShoeChange[] {
  const list = recordsOf(records, horseId).reverse(); // 时间正序
  const changes: ShoeChange[] = [];
  const prev = new Map<HoofPosition, string>();
  for (const r of list) {
    (Object.keys(r.hooves) as HoofPosition[]).forEach((pos) => {
      const cur = r.hooves[pos].shoeType;
      const old = prev.get(pos);
      if (old !== undefined && cur && old !== cur) {
        changes.push({ date: r.date, position: pos, from: old, to: cur, recordId: r.id });
      }
      prev.set(pos, cur);
    });
  }
  return changes.reverse();
}

/** 表单是否可以完成：必填项 + 触发复查时下次复查日期 + 复查时复查结论 */
export interface FormValidation {
  ok: boolean;
  errors: string[];
}

export function validateRecord(input: {
  date: string;
  gaitAbnormal: boolean;
  gaitProblem: string;
  hooves: Record<HoofPosition, HoofEntry>;
  reasons: string[];
  nextCheckDate: string;
  isFollowUp: boolean;
  conclusion: string;
}): FormValidation {
  const errors: string[] = [];
  if (!input.date) errors.push("请选择修蹄日期");
  if (input.gaitAbnormal && !input.gaitProblem.trim()) errors.push("已标记步态异常，请填写步态问题");

  const positions: HoofPosition[] = ["LF", "RF", "LH", "RH"];
  for (const pos of positions) {
    const h = input.hooves[pos];
    if (!h.shape) errors.push("请完成四蹄形态评估");
    if (!h.shoeType) errors.push("请登记四蹄蹄铁类型");
    if (!h.nailPosition.trim()) errors.push("请登记四蹄钉位");
  }
  const dedup = [...new Set(errors)];

  if (input.reasons.length > 0 && !input.nextCheckDate) {
    dedup.push("存在步态异常或左右不一致，必须填写下次复查日期");
  }
  if (input.isFollowUp && !input.conclusion.trim()) {
    dedup.push("复查结论没有填写，不能完成本次记录");
  }
  return { ok: dedup.length === 0, errors: dedup };
}
