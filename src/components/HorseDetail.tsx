import { useMemo, useState } from "react";
import { fmtDate, HOOF_LABELS, toDateInput } from "../constants";
import { isOpen, openRecordsOf, recordsOf, shoeChanges } from "../logic";
import type { ArchiveData, Horse } from "../types";
import RecordCard from "./RecordCard";
import RecordForm, { type RecordInput } from "./RecordForm";

interface Props {
  horse: Horse;
  data: ArchiveData;
  initialRecordId?: string;
  onBack: () => void;
  onSaveRecord: (horseId: string, input: RecordInput) => void;
  onSavePhotoNote: (recordId: string, note: string) => void;
}

export default function HorseDetail({
  horse,
  data,
  initialRecordId,
  onBack,
  onSaveRecord,
  onSavePhotoNote,
}: Props) {
  const [showForm, setShowForm] = useState(!!initialRecordId);
  const [targetRecordId, setTargetRecordId] = useState<string | undefined>(initialRecordId);
  const [filter, setFilter] = useState<"all" | "open" | "gait">("all");

  const list = useMemo(() => recordsOf(data.records, horse.id), [data.records, horse.id]);
  const open = useMemo(() => openRecordsOf(data.records, horse.id), [data.records, horse.id]);
  const changes = useMemo(() => shoeChanges(data.records, horse.id), [data.records, horse.id]);

  const filtered = list.filter((r) => {
    if (filter === "open") return isOpen(r, data.records);
    if (filter === "gait") return r.gait.abnormal;
    return true;
  });

  const recordById = (id?: string) => data.records.find((r) => r.id === id);

  function startFollowUp(recordId: string) {
    setTargetRecordId(recordId);
    setShowForm(true);
    setTimeout(() => document.querySelector(".record-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  return (
    <div className="detail-view">
      <div className="detail-head panel">
        <button className="ghost back" onClick={onBack}>← 返回马匹列表</button>
        <div className="detail-title">
          <div>
            <h2>{horse.code} <small>{horse.name}</small></h2>
            <span className="tag usage">{horse.usage}</span>
            <span className="muted-text"> 档案建立于 {fmtDate(toDateInput(new Date(horse.createdAt)))}</span>
          </div>
          <button className="primary" onClick={() => { setTargetRecordId(undefined); setShowForm((v) => !v); }}>
            {showForm ? "收起登记表" : "登记修蹄"}
          </button>
        </div>
      </div>

      {open.length > 0 && (
        <section className="panel open-panel">
          <div className="heading">
            <div>
              <p>复查提醒</p>
              <h3>{open.length} 条待复查（占用提醒名额）</h3>
            </div>
          </div>
          <div className="open-list">
            {open.map((r) => (
              <div className="open-item" key={r.id}>
                <div>
                  <b>{fmtDate(r.date)} 修蹄</b>
                  <span>{r.reasons.join("；")}</span>
                  <span>计划复查：{fmtDate(r.nextCheckDate)}</span>
                </div>
                <button className="primary small" onClick={() => startFollowUp(r.id)}>去复查</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {showForm && (
        <RecordForm
          openRecords={open}
          initialTargetId={targetRecordId}
          lockFollowUp={!!targetRecordId}
          onCancel={() => setShowForm(false)}
          onSave={(input) => {
            onSaveRecord(horse.id, input);
            setShowForm(false);
            setTargetRecordId(undefined);
          }}
        />
      )}

      <section className="panel">
        <div className="heading">
          <div>
            <p>更换记录</p>
            <h3>蹄铁更换历史</h3>
          </div>
          <span className="muted-text">同一蹄位蹄铁类型变化自动记入</span>
        </div>
        {changes.length === 0 ? (
          <p className="empty-hint">暂无蹄铁更换记录（第二次修蹄起出现类型变化时自动生成）。</p>
        ) : (
          <ul className="shoe-list">
            {changes.map((c, i) => (
              <li key={`${c.recordId}-${c.position}-${i}`}>
                <span className="shoe-date">{fmtDate(c.date)}</span>
                <span className="shoe-pos">{HOOF_LABELS[c.position]}</span>
                <span className="shoe-from">{c.from}</span>
                <span className="shoe-arrow">→</span>
                <span className="shoe-to">{c.to}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>时间线</p>
            <h3>修蹄档案（{list.length}）</h3>
          </div>
          <div className="chips">
            <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>全部</button>
            <button className={filter === "open" ? "selected" : ""} onClick={() => setFilter("open")}>待复查</button>
            <button className={filter === "gait" ? "selected" : ""} onClick={() => setFilter("gait")}>异常步态</button>
          </div>
        </div>
        <div className="timeline">
          {filtered.map((r) => (
            <RecordCard
              key={r.id}
              record={r}
              open={isOpen(r, data.records)}
              resolving={recordById(r.resolvesRecordId)}
              onStartFollowUp={startFollowUp}
              onSavePhotoNote={onSavePhotoNote}
            />
          ))}
          {filtered.length === 0 && <p className="empty-hint">没有符合条件的历史记录。</p>}
        </div>
      </section>
    </div>
  );
}
