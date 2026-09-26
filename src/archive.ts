export interface HoofAssessment {
  morphology: string;
  note: string;
}

export interface HoofSet {
  leftFront: HoofAssessment;
  rightFront: HoofAssessment;
  leftHind: HoofAssessment;
  rightHind: HoofAssessment;
}

export interface HoofRecord {
  id: string;
  horseId: string;
  trimDate: string; // 修蹄日期
  nextReviewDate: string; // 下次复查日期
  hooves: HoofSet;
  gaitIssues: string[]; // 步态问题
  gaitNote: string;
  shoeType: string; // 蹄铁类型
  nailPositions: string; // 钉位
  photoNote: string; // 照片备注（可后补）
  reviewConclusion: string; // 复查结论
  abnormal: boolean;
  abnormalReasons: string[];
  completed: boolean;
  createdAt: number;
}

export interface Horse {
  id: string;
  code: string;
  name: string;
  status: "运动马" | "休养马";
}

export interface ShoeChange {
  id: string;
  horseId: string;
  date: string;
  from: string;
  to: string;
}

export interface Db {
  horses: Horse[];
  records: HoofRecord[];
  shoeChanges: ShoeChange[];
}

export const MORPHOLOGY_OPTIONS = [
  "形态正常",
  "外侧磨耗",
  "内侧磨耗",
  "蹄壁裂纹",
  "蹄踵过低",
  "蹄叉萎缩",
  "蹄壁变形",
];

export const GAIT_OPTIONS = ["跛行", "步态不稳", "抬蹄迟缓", "落地外偏", "步幅缩短"];

export const SHOE_TYPES = ["钢蹄铁", "铝蹄铁", "橡胶蹄铁", "加护蹄垫", "无蹄铁（裸蹄）"];

export const HOOF_LABELS: { key: keyof HoofSet; label: string }[] = [
  { key: "leftFront", label: "左前蹄" },
  { key: "rightFront", label: "右前蹄" },
  { key: "leftHind", label: "左后蹄" },
  { key: "rightHind", label: "右后蹄" },
];

/** 任一步态异常或左右蹄评估不一致 → 进入复查提醒 */
export function evaluateAbnormal(
  hooves: HoofSet,
  gaitIssues: string[],
): { abnormal: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (gaitIssues.length > 0) {
    reasons.push("步态异常：" + gaitIssues.join("、"));
  }
  if (hooves.leftFront.morphology !== hooves.rightFront.morphology) {
    reasons.push(
      `前蹄左右不一致（左：${hooves.leftFront.morphology} / 右：${hooves.rightFront.morphology}）`,
    );
  }
  if (hooves.leftHind.morphology !== hooves.rightHind.morphology) {
    reasons.push(
      `后蹄左右不一致（左：${hooves.leftHind.morphology} / 右：${hooves.rightHind.morphology}）`,
    );
  }
  return { abnormal: reasons.length > 0, reasons };
}

export function dateInputValue(d: Date = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const normalHoof = (): HoofAssessment => ({ morphology: "形态正常", note: "" });

export function seedDb(): Db {
  const horses: Horse[] = [
    { id: "h18", code: "HORSE-18", name: "追风", status: "运动马" },
    { id: "h27", code: "HORSE-27", name: "云朵", status: "休养马" },
    { id: "h31", code: "HORSE-31", name: "惊雷", status: "运动马" },
    { id: "h42", code: "HORSE-42", name: "墨玉", status: "运动马" },
  ];

  const records: HoofRecord[] = [
    {
      id: "r-h18-1",
      horseId: "h18",
      trimDate: "2026-08-15",
      nextReviewDate: "2026-09-12",
      hooves: {
        leftFront: normalHoof(),
        rightFront: normalHoof(),
        leftHind: normalHoof(),
        rightHind: normalHoof(),
      },
      gaitIssues: [],
      gaitNote: "",
      shoeType: "钢蹄铁",
      nailPositions: "前蹄6钉 · 后蹄4钉",
      photoNote: "",
      reviewConclusion: "修蹄后步态正常",
      abnormal: false,
      abnormalReasons: [],
      completed: true,
      createdAt: Date.parse("2026-08-15T10:00:00"),
    },
    {
      id: "r-h18-2",
      horseId: "h18",
      trimDate: "2026-09-12",
      nextReviewDate: "2026-09-26",
      hooves: {
        leftFront: normalHoof(),
        rightFront: { morphology: "外侧磨耗", note: "外侧蹄壁磨耗明显" },
        leftHind: normalHoof(),
        rightHind: normalHoof(),
      },
      gaitIssues: [],
      gaitNote: "",
      shoeType: "铝蹄铁",
      nailPositions: "前蹄6钉 · 后蹄4钉",
      photoNote: "",
      reviewConclusion: "",
      abnormal: true,
      abnormalReasons: ["前蹄左右不一致（左：形态正常 / 右：外侧磨耗）"],
      completed: false,
      createdAt: Date.parse("2026-09-12T10:00:00"),
    },
    {
      id: "r-h27-1",
      horseId: "h27",
      trimDate: "2026-09-05",
      nextReviewDate: "2026-10-05",
      hooves: {
        leftFront: normalHoof(),
        rightFront: normalHoof(),
        leftHind: { morphology: "蹄壁裂纹", note: "裂纹已打磨处理" },
        rightHind: { morphology: "蹄壁裂纹", note: "裂纹已打磨处理" },
      },
      gaitIssues: [],
      gaitNote: "",
      shoeType: "加护蹄垫",
      nailPositions: "后蹄4钉",
      photoNote: "已拍后蹄特写存档",
      reviewConclusion: "裂纹打磨后稳定，继续观察",
      abnormal: false,
      abnormalReasons: [],
      completed: true,
      createdAt: Date.parse("2026-09-05T09:00:00"),
    },
    {
      id: "r-h31-1",
      horseId: "h31",
      trimDate: "2026-09-20",
      nextReviewDate: "2026-10-04",
      hooves: {
        leftFront: normalHoof(),
        rightFront: normalHoof(),
        leftHind: normalHoof(),
        rightHind: normalHoof(),
      },
      gaitIssues: ["步态不稳"],
      gaitNote: "慢步时轻微摇晃，需教练复核",
      shoeType: "钢蹄铁",
      nailPositions: "前蹄6钉 · 后蹄4钉",
      photoNote: "",
      reviewConclusion: "",
      abnormal: true,
      abnormalReasons: ["步态异常：步态不稳"],
      completed: false,
      createdAt: Date.parse("2026-09-20T15:00:00"),
    },
    {
      id: "r-h42-1",
      horseId: "h42",
      trimDate: "2026-09-22",
      nextReviewDate: "2026-11-22",
      hooves: {
        leftFront: normalHoof(),
        rightFront: normalHoof(),
        leftHind: normalHoof(),
        rightHind: normalHoof(),
      },
      gaitIssues: [],
      gaitNote: "",
      shoeType: "钢蹄铁",
      nailPositions: "前蹄6钉 · 后蹄4钉",
      photoNote: "",
      reviewConclusion: "",
      abnormal: false,
      abnormalReasons: [],
      completed: true,
      createdAt: Date.parse("2026-09-22T11:00:00"),
    },
  ];

  const shoeChanges: ShoeChange[] = [
    { id: "sc-h18-1", horseId: "h18", date: "2026-09-12", from: "钢蹄铁", to: "铝蹄铁" },
    { id: "sc-h27-1", horseId: "h27", date: "2026-09-05", from: "钢蹄铁", to: "加护蹄垫" },
  ];

  return { horses, records, shoeChanges };
}
