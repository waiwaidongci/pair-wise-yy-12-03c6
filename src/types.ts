// 档案台核心数据模型

/** 四蹄方位 */
export type HoofPosition = "LF" | "RF" | "LH" | "RH";

/** 运动用途 */
export type HorseUsage = "运动马" | "休养马";

/** 四蹄记录：形态、蹄铁类型、钉位分别登记 */
export interface HoofEntry {
  /** 蹄形评估（形态） */
  shape: string;
  /** 蹄铁类型 */
  shoeType: string;
  /** 钉位描述，如「外侧 3 钉 / 内侧 2 钉」 */
  nailPosition: string;
}

/** 步态记录 */
export interface GaitInfo {
  /** 步态是否异常 */
  abnormal: boolean;
  /** 步态问题描述（异常时必填） */
  problem: string;
}

/** 单次修蹄 / 复查记录 */
export interface TrimRecord {
  id: string;
  horseId: string;
  /** 修蹄日期 YYYY-MM-DD */
  date: string;
  /** 本次是否为复查（针对上一条待复查记录） */
  isFollowUp: boolean;
  gait: GaitInfo;
  /** 四个蹄位的独立评估，键为 HoofPosition */
  hooves: Record<HoofPosition, HoofEntry>;
  /** 下次复查日期；异常或左右不一致时必填 */
  nextCheckDate: string;
  /** 自动进入复查提醒的原因；为空表示正常记录 */
  reasons: string[];
  /** 若本次为复查，指向被复查的待复查记录 */
  resolvesRecordId?: string;
  /** 复查结论：待复查记录完成复查时必填 */
  conclusion: string;
  /** 照片备注，可后补 */
  photoNote: string;
  createdAt: number;
}

/** 马匹档案 */
export interface Horse {
  id: string;
  code: string;
  name: string;
  usage: HorseUsage;
  createdAt: number;
}

/** 档案台全部数据 */
export interface ArchiveData {
  horses: Horse[];
  records: TrimRecord[];
}
