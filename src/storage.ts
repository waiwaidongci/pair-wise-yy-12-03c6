import { addDays, STORAGE_KEY, today, uid } from "./constants";
import type { ArchiveData, HoofEntry, HoofPosition, TrimRecord } from "./types";

function emptyHoof(shape: string, shoeType: string, nailPosition: string): HoofEntry {
  return { shape, shoeType, nailPosition };
}

function makeRecord(partial: Omit<TrimRecord, "id" | "createdAt" | "photoNote"> & { photoNote?: string }): TrimRecord {
  return {
    id: uid("rec"),
    createdAt: Date.now() + Math.floor(Math.random() * 1000),
    photoNote: "",
    ...partial,
  };
}

function allHooves(shape: string, shoe: string, nail = "标准钉位：外 3 内 2"): Record<HoofPosition, HoofEntry> {
  return {
    LF: emptyHoof(shape, shoe, nail),
    RF: emptyHoof(shape, shoe, nail),
    LH: emptyHoof(shape, shoe, nail),
    RH: emptyHoof(shape, shoe, nail),
  };
}

/** 首次使用时的示例档案，保存后以本地数据为准 */
export function seedData(): ArchiveData {
  const t = today();
  const h18 = uid("horse");
  const h27 = uid("horse");
  const h31 = uid("horse");
  const h09 = uid("horse");

  const r18 = makeRecord({
    horseId: h18,
    date: addDays(t, -10),
    isFollowUp: false,
    gait: { abnormal: true, problem: "右前肢运步偏短，硬地跛行明显" },
    hooves: {
      LF: emptyHoof("形态正常", "铝蹄铁", "外 3 内 2"),
      RF: emptyHoof("外侧磨耗", "铝蹄铁", "外 2 内 2，减载处理"),
      LH: emptyHoof("形态正常", "铝蹄铁", "外 3 内 2"),
      RH: emptyHoof("形态正常", "铝蹄铁", "外 3 内 2"),
    },
    nextCheckDate: addDays(t, 4),
    reasons: ["步态异常", "左右蹄评估不一致（前蹄）"],
    conclusion: "",
    photoNote: "右前蹄外侧已拍照，等待补备注",
  });

  const r27 = makeRecord({
    horseId: h27,
    date: addDays(t, -6),
    isFollowUp: false,
    gait: { abnormal: false, problem: "" },
    hooves: {
      LF: emptyHoof("形态正常", "普通钢蹄铁", "外 3 内 2"),
      RF: emptyHoof("形态正常", "普通钢蹄铁", "外 3 内 2"),
      LH: emptyHoof("蹄裂", "加护蹄垫", "裂纹两侧各减 1 钉"),
      RH: emptyHoof("形态正常", "普通钢蹄铁", "外 3 内 2"),
    },
    nextCheckDate: addDays(t, 8),
    reasons: ["左右蹄评估不一致（后蹄）"],
    conclusion: "",
    photoNote: "",
  });

  const r31 = makeRecord({
    horseId: h31,
    date: addDays(t, -20),
    isFollowUp: false,
    gait: { abnormal: false, problem: "" },
    hooves: allHooves("形态正常", "铝蹄铁"),
    nextCheckDate: "",
    reasons: [],
    conclusion: "",
    photoNote: "",
  });
  const r31Follow = makeRecord({
    horseId: h31,
    date: addDays(t, -6),
    isFollowUp: false,
    gait: { abnormal: true, problem: "快步时步态轻微不稳，后肢发力不均" },
    hooves: allHooves("角质过长", "普通钢蹄铁"),
    nextCheckDate: addDays(t, 1),
    reasons: ["步态异常"],
    conclusion: "",
    photoNote: "需教练复核",
  });

  const r09 = makeRecord({
    horseId: h09,
    date: addDays(t, -14),
    isFollowUp: false,
    gait: { abnormal: false, problem: "" },
    hooves: allHooves("形态正常", "铝蹄铁"),
    nextCheckDate: "",
    reasons: [],
    conclusion: "",
    photoNote: "",
  });

  return {
    horses: [
      { id: h18, code: "HORSE-18", name: "黑风", usage: "运动马", createdAt: Date.now() - 4000 },
      { id: h27, code: "HORSE-27", name: "云蹄", usage: "休养马", createdAt: Date.now() - 3000 },
      { id: h31, code: "HORSE-31", name: "踏雪", usage: "运动马", createdAt: Date.now() - 2000 },
      { id: h09, code: "HORSE-09", name: "青骓", usage: "运动马", createdAt: Date.now() - 1000 },
    ],
    records: [r18, r27, r31, r31Follow, r09],
  };
}

export function loadData(): ArchiveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ArchiveData;
      if (Array.isArray(parsed.horses) && Array.isArray(parsed.records)) {
        return parsed;
      }
    }
  } catch {
    // 存储损坏时回落到示例数据
  }
  const seed = seedData();
  saveData(seed);
  return seed;
}

export function saveData(data: ArchiveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // 隐私模式等场景下忽略写入失败
  }
}
