import { useMemo, useState } from "react";
import {
  HOOF_LABELS,
  HOOF_ORDER,
  HOOF_PAIRS,
  REASON,
  SHAPE_OPTIONS,
  SHOE_OPTIONS,
  today,
} from "../constants";
import { detectReasons, mismatchedPairs, validateRecord } from "../logic";
import type { HoofEntry, HoofPosition, TrimRecord } from "../types";

interface Props {
  /** 该马当前待复查记录；非空时可直接做复查 */
  openRecords: TrimRecord[];
  /** 初始定位的待复查记录 id（从提醒面板进入） */
  initialTargetId?: string;
  /** 从提醒直接进入时锁定为复查模式，不能取消勾选来绕过必填结论 */
  lockFollowUp?: boolean;
  onSave: (input: RecordInput) => void;
  onCancel: () => void;
}

export interface RecordInput {
  date: string;
  isFollowUp: boolean;
  resolvesRecordId?: string;
  gaitAbnormal: boolean;
  gaitProblem: string;
  hooves: Record<HoofPosition, HoofEntry>;
  /** 由步态异常 / 左右不一致自动判定 */
  reasons: string[];
  nextCheckDate: string;
  conclusion: string;
  photoNote: string;
}

function blankHoof(): HoofEntry {
  return { shape: "", shoeType: "", nailPosition: "" };
}

export default function RecordForm({ openRecords, initialTargetId, lockFollowUp, onSave, onCancel }: Props) {
  const canFollowUp = openRecords.length > 0;
  const [isFollowUp, setIsFollowUp] = useState(canFollowUp && !!initialTargetId);
  const [resolvesRecordId, setResolvesRecordId] = useState(
    initialTargetId ?? openRecords[0]?.id ?? "",
  );
  const [date, setDate] = useState(today());
  const [gaitAbnormal, setGaitAbnormal] = useState(false);
  const [gaitProblem, setGaitProblem] = useState("");
  const [hooves, setHooves] = useState<Record<HoofPosition, HoofEntry>>({
    LF: blankHoof(),
    RF: blankHoof(),
    LH: blankHoof(),
    RH: blankHoof(),
  });
  const [nextCheckDate, setNextCheckDate] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);

  const reasons = useMemo(() => detectReasons(gaitAbnormal, hooves), [gaitAbnormal, hooves]);
  const mismatch = useMemo(() => mismatchedPairs(hooves), [hooves]);
  const needsFollowUp = reasons.length > 0;

  function updateHoof(pos: HoofPosition, patch: Partial<HoofEntry>) {
    setHooves((prev) => ({ ...prev, [pos]: { ...prev[pos], ...patch } }));
  }

  /** 一键把某个蹄位的登记复制到另外三个蹄位 */
  function copyToAll(pos: HoofPosition) {
    setHooves((prev) => ({
      LF: { ...prev[pos] },
      RF: { ...prev[pos] },
      LH: { ...prev[pos] },
      RH: { ...prev[pos] },
    }));
  }

  function toggleFollowUp(v: boolean) {
    setIsFollowUp(v);
    if (v && !resolvesRecordId && openRecords[0]) {
      setResolvesRecordId(openRecords[0].id);
    }
  }

  function handleSave() {
    setAttempted(true);
    const result = validateRecord({
      date,
      gaitAbnormal,
      gaitProblem,
      hooves,
      reasons,
      nextCheckDate,
      isFollowUp,
      conclusion,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSave({
      date,
      isFollowUp,
      resolvesRecordId: isFollowUp ? resolvesRecordId : undefined,
      gaitAbnormal,
      gaitProblem: gaitProblem.trim(),
      hooves,
      reasons,
      nextCheckDate,
      conclusion: conclusion.trim(),
      photoNote: photoNote.trim(),
    });
  }

  const showErrors = attempted ? errors : [];

  return (
    <section className="panel record-form">
      <div className="heading">
        <div>
          <p>新登记</p>
          <h2>修蹄 / 复查记录</h2>
        </div>
        <div className="heading-actions">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={handleSave}>
            完成本次记录
          </button>
        </div>
      </div>

      {showErrors.length > 0 && (
        <div className="error-box">
          <b>无法完成，请先处理：</b>
          <ul>
            {showErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {canFollowUp && (
        <div className="box-soft followup-box">
          <label className="inline-check">
            <input
              type="checkbox"
              checked={isFollowUp}
              disabled={lockFollowUp}
              onChange={(e) => toggleFollowUp(e.target.checked)}
            />
            <span>本次为复查（完成待复查提醒）</span>
          </label>
          {isFollowUp && (
            <label className="followup-select">
              <span>复查对象</span>
              <select value={resolvesRecordId} onChange={(e) => setResolvesRecordId(e.target.value)}>
                {openRecords.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.date} 修蹄 · {r.reasons.join("、")}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <div className="form-row two">
        <label>
          <span>修蹄日期 *</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="gait-block">
          <label className="inline-check">
            <input type="checkbox" checked={gaitAbnormal} onChange={(e) => setGaitAbnormal(e.target.checked)} />
            <span>存在步态异常</span>
          </label>
          <textarea
            placeholder={gaitAbnormal ? "描述步态问题，如：右前肢运步偏短、硬地跛行 *" : "步态正常时无需填写"}
            value={gaitProblem}
            disabled={!gaitAbnormal}
            onChange={(e) => setGaitProblem(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      <div className="hoof-section">
        <div className="hoof-section-head">
          <h3>四蹄对比登记</h3>
          <p>分别登记四个蹄位的形态、蹄铁类型与钉位；左右形态不一致会自动进入复查。</p>
        </div>

        <div className="hoof-table" role="table">
          <div className="hoof-row hoof-head-row" role="row">
            <div role="columnheader">蹄位</div>
            <div role="columnheader">形态评估 *</div>
            <div role="columnheader">蹄铁类型 *</div>
            <div role="columnheader">钉位 *</div>
            <div role="columnheader" />
          </div>
          {HOOF_ORDER.map((pos) => (
            <div className="hoof-row" role="row" key={pos}>
              <div className="hoof-pos" role="cell">
                <b>{HOOF_LABELS[pos]}</b>
              </div>
              <div role="cell">
                <select value={hooves[pos].shape} onChange={(e) => updateHoof(pos, { shape: e.target.value })}>
                  <option value="">选择形态</option>
                  {SHAPE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div role="cell">
                <select value={hooves[pos].shoeType} onChange={(e) => updateHoof(pos, { shoeType: e.target.value })}>
                  <option value="">选择蹄铁</option>
                  {SHOE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div role="cell">
                <input
                  placeholder="如：外 3 内 2"
                  value={hooves[pos].nailPosition}
                  onChange={(e) => updateHoof(pos, { nailPosition: e.target.value })}
                />
              </div>
              <div role="cell">
                <button type="button" className="ghost small" title="将本行内容复制到其他三个蹄位" onClick={() => copyToAll(pos)}>
                  同步四蹄
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pair-compare">
          {HOOF_PAIRS.map((p) => {
            const l = hooves[p.left].shape;
            const r = hooves[p.right].shape;
            const diff = l && r && l !== r;
            return (
              <div key={p.key} className={`pair-item ${diff ? "diff" : l && r ? "same" : ""}`}>
                <b>{p.label}对比</b>
                <span>
                  左{HOOF_LABELS[p.left].slice(1)}：{l || "未评"}
                </span>
                <span>
                  右{HOOF_LABELS[p.right].slice(1)}：{r || "未评"}
                </span>
                {diff ? <em className="pair-flag">左右不一致 → 自动复查</em> : <em className="pair-ok">一致</em>}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`followup-auto box-soft ${needsFollowUp ? "triggered" : ""}`}>
        <div className="followup-auto-head">
          <h3>复查判定</h3>
          {needsFollowUp ? (
            <span className="badge danger">自动进入复查提醒</span>
          ) : (
            <span className="badge ok">正常记录 · 不占提醒名额</span>
          )}
        </div>
        <ul className="reason-list">
          <li className={gaitAbnormal ? "on" : ""}>
            {gaitAbnormal ? "✓" : "○"} {REASON.GAIT}
            {gaitAbnormal && gaitProblem ? `：${gaitProblem}` : ""}
          </li>
          <li className={mismatch.length > 0 ? "on" : ""}>
            {mismatch.length > 0 ? "✓" : "○"} {REASON.PAIR}
            {mismatch.length > 0 ? `（${mismatch.join("、")}）` : ""}
          </li>
        </ul>
        <label className={needsFollowUp ? "required" : ""}>
          <span>下次复查日期 {needsFollowUp ? "*（异常必须填写）" : "（选填）"}</span>
          <input
            type="date"
            value={nextCheckDate}
            min={date}
            onChange={(e) => setNextCheckDate(e.target.value)}
          />
        </label>
      </div>

      {isFollowUp && (
        <div className="box-soft conclusion-box required-block">
          <label className={!conclusion.trim() && attempted ? "invalid" : ""}>
            <span>复查结论 *（不填写不能完成本次记录）</span>
            <textarea
              rows={3}
              placeholder="本次复查的评估与处置，如：右前蹄磨耗改善，继续铝蹄铁减载 14 天"
              value={conclusion}
              onChange={(e) => setConclusion(e.target.value)}
            />
          </label>
        </div>
      )}

      <div className="photo-box">
        <label>
          <span>照片备注（可后补）</span>
          <textarea
            rows={2}
            placeholder="记录照片编号或说明，保存后仍可在历史中补写"
            value={photoNote}
            onChange={(e) => setPhotoNote(e.target.value)}
          />
        </label>
      </div>
    </section>
  );
}
