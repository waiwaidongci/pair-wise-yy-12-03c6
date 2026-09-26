import { useState } from "react";
import { daysUntil, fmtDate, HOOF_LABELS, HOOF_ORDER, HOOF_PAIRS } from "../constants";
import type { TrimRecord } from "../types";

interface Props {
  record: TrimRecord;
  open: boolean;
  resolving?: TrimRecord;
  onStartFollowUp?: (recordId: string) => void;
  onSavePhotoNote?: (recordId: string, note: string) => void;
}

export default function RecordCard({
  record,
  open,
  resolving,
  onStartFollowUp,
  onSavePhotoNote,
}: Props) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(record.photoNote);

  const dleft = record.nextCheckDate ? daysUntil(record.nextCheckDate) : null;

  return (
    <article className={`record-card ${open ? "open" : ""} ${record.isFollowUp ? "followup" : ""}`}>
      <div className="record-card-head">
        <div className="record-date">
          <b>{fmtDate(record.date)}</b>
          <div className="badges">
            {record.isFollowUp && <span className="badge followup-tag">复查记录</span>}
            {open && (
              <span className={`badge ${dleft !== null && dleft < 0 ? "danger" : dleft !== null && dleft <= 3 ? "warn" : "info"}`}>
                {dleft === null
                  ? "待复查"
                  : dleft < 0
                    ? `复查已逾期 ${-dleft} 天`
                    : dleft === 0
                      ? "今天复查"
                      : `${dleft} 天后复查`}
              </span>
            )}
            {!open && record.reasons.length > 0 && <span className="badge ok">复查已完成</span>}
            {record.reasons.length === 0 && <span className="badge muted">正常记录</span>}
            {record.gait.abnormal && <span className="badge danger">步态异常</span>}
          </div>
        </div>
        {open && onStartFollowUp && (
          <button className="primary small" onClick={() => onStartFollowUp(record.id)}>
            填写复查
          </button>
        )}
      </div>

      {record.reasons.length > 0 && (
        <p className="reasons">
          进入复查：{record.reasons.join("；")}
          {record.nextCheckDate && <> · 计划 {fmtDate(record.nextCheckDate)}</>}
        </p>
      )}

      <div className="gait-line">
        <b>步态：</b>
        {record.gait.abnormal ? (
          <span className="danger-text">异常 — {record.gait.problem}</span>
        ) : (
          <span className="ok-text">步态正常</span>
        )}
      </div>

      <div className="hoof-mini-grid">
        {HOOF_ORDER.map((pos) => (
          <div className="hoof-mini" key={pos}>
            <b>{HOOF_LABELS[pos]}</b>
            <span>{record.hooves[pos].shape || "—"}</span>
            <span>{record.hooves[pos].shoeType || "—"}</span>
            <small>钉位：{record.hooves[pos].nailPosition || "—"}</small>
          </div>
        ))}
      </div>

      {HOOF_PAIRS.map((p) => {
        const l = record.hooves[p.left].shape;
        const r = record.hooves[p.right].shape;
        if (!l || !r || l === r) return null;
        return (
          <p className="pair-line" key={p.key}>
            ⚠ {p.label}形态不一致：{HOOF_LABELS[p.left]}「{l}」 / {HOOF_LABELS[p.right]}「{r}」
          </p>
        );
      })}

      {record.isFollowUp && (
        <div className="conclusion-line">
          <b>复查结论：</b>
          {record.conclusion ? record.conclusion : <span className="danger-text">未填写</span>}
        </div>
      )}
      {resolving && (
        <p className="resolving-line">
          本次复查关闭了 {fmtDate(resolving.date)} 的待复查提醒
        </p>
      )}

      <div className="photo-line">
        <div className="photo-line-head">
          <b>照片备注</b>
          {!editingNote && (
            <button className="ghost small" onClick={() => { setNoteDraft(record.photoNote); setEditingNote(true); }}>
              {record.photoNote ? "修改" : "后补"}
            </button>
          )}
        </div>
        {editingNote ? (
          <div className="photo-edit">
            <textarea
              rows={2}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="照片编号 / 备注说明"
            />
            <div className="photo-edit-actions">
              <button className="small" onClick={() => setEditingNote(false)}>取消</button>
              <button
                className="primary small"
                onClick={() => {
                  onSavePhotoNote?.(record.id, noteDraft.trim());
                  setEditingNote(false);
                }}
              >
                保存备注
              </button>
            </div>
          </div>
        ) : (
          <p>{record.photoNote || <span className="muted-text">尚未填写，可随时后补</span>}</p>
        )}
      </div>
    </article>
  );
}
