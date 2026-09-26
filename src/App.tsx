import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import {
  Db,
  GAIT_OPTIONS,
  HOOF_LABELS,
  HoofRecord,
  HoofSet,
  Horse,
  MORPHOLOGY_OPTIONS,
  SHOE_TYPES,
  dateInputValue,
  evaluateAbnormal,
  seedDb,
  uid,
} from "./archive";

const STORAGE_KEY = "hxyfront-62011-archive";

function loadDb(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (parsed && Array.isArray(parsed.horses) && Array.isArray(parsed.records)) {
        return { ...parsed, shoeChanges: parsed.shoeChanges ?? [] };
      }
    }
  } catch {
    // 数据损坏时回退到示例数据
  }
  return seedDb();
}

interface Draft {
  trimDate: string;
  nextReviewDate: string;
  hooves: HoofSet;
  gaitIssues: string[];
  gaitNote: string;
  shoeType: string;
  nailPositions: string;
  photoNote: string;
}

function emptyDraft(): Draft {
  const inTwoWeeks = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  return {
    trimDate: dateInputValue(),
    nextReviewDate: dateInputValue(inTwoWeeks),
    hooves: {
      leftFront: { morphology: "形态正常", note: "" },
      rightFront: { morphology: "形态正常", note: "" },
      leftHind: { morphology: "形态正常", note: "" },
      rightHind: { morphology: "形态正常", note: "" },
    },
    gaitIssues: [],
    gaitNote: "",
    shoeType: SHOE_TYPES[0],
    nailPositions: "",
    photoNote: "",
  };
}

type Filter = "all" | "review" | "gait";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部马匹" },
  { key: "review", label: "待复查" },
  { key: "gait", label: "异常步态" },
];

function App() {
  const [db, setDb] = useState<Db>(loadDb);
  const [selectedHorseId, setSelectedHorseId] = useState<string>(db.horses[0]?.id ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }, [db]);

  useEffect(() => {
    setDraft(emptyDraft());
    setMessage("");
  }, [selectedHorseId]);

  const horseById = useMemo(() => {
    const map = new Map<string, Horse>();
    db.horses.forEach((h) => map.set(h.id, h));
    return map;
  }, [db.horses]);

  const pendingReviews = useMemo(
    () =>
      db.records
        .filter((r) => r.abnormal && !r.completed)
        .sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate)),
    [db.records],
  );

  const gaitRecordHorseIds = useMemo(
    () => new Set(db.records.filter((r) => r.gaitIssues.length > 0).map((r) => r.horseId)),
    [db.records],
  );

  const metrics = {
    review: pendingReviews.length,
    gait: db.records.filter((r) => r.gaitIssues.length > 0).length,
    shoeChanges: db.shoeChanges.length,
    horses: db.horses.length,
  };

  const visibleHorses = db.horses.filter((h) => {
    if (filter === "review") return pendingReviews.some((r) => r.horseId === h.id);
    if (filter === "gait") return gaitRecordHorseIds.has(h.id);
    return true;
  });

  const selectedHorse = horseById.get(selectedHorseId);
  const horseRecords = db.records
    .filter((r) => r.horseId === selectedHorseId)
    .sort((a, b) => b.trimDate.localeCompare(a.trimDate));
  const horseShoeChanges = db.shoeChanges
    .filter((c) => c.horseId === selectedHorseId)
    .sort((a, b) => b.date.localeCompare(a.date));

  const draftEval = evaluateAbnormal(draft.hooves, draft.gaitIssues);

  const toggleGait = (issue: string) => {
    setDraft((d) => ({
      ...d,
      gaitIssues: d.gaitIssues.includes(issue)
        ? d.gaitIssues.filter((g) => g !== issue)
        : [...d.gaitIssues, issue],
    }));
  };

  const saveRecord = () => {
    if (!selectedHorse) return;
    if (!draft.trimDate) return setMessage("请填写修蹄日期。");
    if (!draft.nailPositions.trim()) return setMessage("请填写钉位。");
    if (draftEval.abnormal && !draft.nextReviewDate) {
      return setMessage("该记录将进入复查提醒，请填写下次复查日期。");
    }

    const record: HoofRecord = {
      id: uid(),
      horseId: selectedHorse.id,
      trimDate: draft.trimDate,
      nextReviewDate: draft.nextReviewDate,
      hooves: draft.hooves,
      gaitIssues: draft.gaitIssues,
      gaitNote: draft.gaitNote.trim(),
      shoeType: draft.shoeType,
      nailPositions: draft.nailPositions.trim(),
      photoNote: draft.photoNote.trim(),
      reviewConclusion: "",
      abnormal: draftEval.abnormal,
      abnormalReasons: draftEval.reasons,
      completed: !draftEval.abnormal, // 正常记录直接完成，不占复查提醒名额
      createdAt: Date.now(),
    };

    setDb((prev) => {
      // 更换蹄铁 → 写入该马历史
      const last = prev.records
        .filter((r) => r.horseId === selectedHorse.id)
        .sort((a, b) => b.trimDate.localeCompare(a.trimDate))[0];
      const changes = [...prev.shoeChanges];
      if (last && last.shoeType !== record.shoeType) {
        changes.push({
          id: uid(),
          horseId: selectedHorse.id,
          date: record.trimDate,
          from: last.shoeType,
          to: record.shoeType,
        });
      }
      return { ...prev, records: [...prev.records, record], shoeChanges: changes };
    });

    setDraft(emptyDraft());
    setMessage(
      draftEval.abnormal
        ? "已保存。该记录存在异常，已进入复查提醒，填写复查结论后才能完成。"
        : "已保存，记录正常，直接归档完成。",
    );
  };

  const savePhotoNote = (recordId: string, note: string) => {
    setDb((prev) => ({
      ...prev,
      records: prev.records.map((r) => (r.id === recordId ? { ...r, photoNote: note } : r)),
    }));
  };

  const completeRecord = (recordId: string, conclusion: string) => {
    if (!conclusion.trim()) return;
    setDb((prev) => ({
      ...prev,
      records: prev.records.map((r) =>
        r.id === recordId ? { ...r, reviewConclusion: conclusion.trim(), completed: true } : r,
      ),
    }));
  };

  const resetAll = () => {
    if (!window.confirm("确定清空全部档案并恢复示例数据？")) return;
    const fresh = seedDb();
    setDb(fresh);
    setSelectedHorseId(fresh.horses[0]?.id ?? "");
    setFilter("all");
  };

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62011 · 蹄铁师档案台</p>
        <h1>马术蹄铁修整档案</h1>
        <span>
          从左侧马匹列表进入档案，登记四蹄形态、步态问题、蹄铁类型、钉位与修蹄日期。
          任一步态异常或左右蹄评估不一致的记录会自动进入复查提醒；更换蹄铁会写入该马历史，
          所有档案保存在本机，重新打开页面不丢失。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>待复查</small>
          <strong>{metrics.review}</strong>
        </article>
        <article>
          <small>异常步态</small>
          <strong>{metrics.gait}</strong>
        </article>
        <article>
          <small>更换蹄铁</small>
          <strong>{metrics.shoeChanges}</strong>
        </article>
        <article>
          <small>马匹档案</small>
          <strong>{metrics.horses}</strong>
        </article>
      </section>

      {pendingReviews.length > 0 && (
        <section className="panel reminders">
          <div className="heading">
            <div>
              <p>复查提醒</p>
              <h2>待复查 {pendingReviews.length} 条</h2>
            </div>
          </div>
          <div className="records">
            {pendingReviews.map((r) => {
              const horse = horseById.get(r.horseId);
              return (
                <article key={r.id}>
                  <b>{r.nextReviewDate.slice(5)}</b>
                  <div>
                    <h3>
                      {horse?.code} {horse?.name}
                      <span className="badge warn">待复查</span>
                    </h3>
                    <p>{r.abnormalReasons.join("；")}</p>
                    <p>
                      修蹄 {r.trimDate} · 下次复查 {r.nextReviewDate} · 尚未填写复查结论
                    </p>
                  </div>
                  <button onClick={() => setSelectedHorseId(r.horseId)}>去填写结论</button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="workspace">
        <aside className="panel">
          <h2>马匹列表</h2>
          <div className="chips">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                className={filter === f.key ? "chip active" : "chip"}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="horse-list">
            {visibleHorses.length === 0 && <p className="empty">当前筛选下没有马匹。</p>}
            {visibleHorses.map((h) => {
              const pending = pendingReviews.filter((r) => r.horseId === h.id).length;
              const gait = gaitRecordHorseIds.has(h.id);
              return (
                <button
                  key={h.id}
                  className={h.id === selectedHorseId ? "horse active" : "horse"}
                  onClick={() => setSelectedHorseId(h.id)}
                >
                  <span>
                    <strong>
                      {h.code} {h.name}
                    </strong>
                    <small>{h.status}</small>
                  </span>
                  <span className="badges">
                    {pending > 0 && <em className="badge warn">待复查 {pending}</em>}
                    {gait && <em className="badge danger">异常步态</em>}
                  </span>
                </button>
              );
            })}
          </div>
          <button className="link" onClick={resetAll}>
            清空并恢复示例数据
          </button>
        </aside>

        <section className="panel form-panel">
          {selectedHorse ? (
            <>
              <div className="heading">
                <div>
                  <p>
                    {selectedHorse.code} · {selectedHorse.name} · {selectedHorse.status}
                  </p>
                  <h2>新增修蹄记录</h2>
                </div>
                <button className="primary" onClick={saveRecord}>
                  保存记录
                </button>
              </div>

              <div className="field-grid">
                <label>
                  <span>修蹄日期</span>
                  <input
                    type="date"
                    value={draft.trimDate}
                    onChange={(e) => setDraft({ ...draft, trimDate: e.target.value })}
                  />
                </label>
                <label>
                  <span>下次复查日期{draftEval.abnormal ? "（异常必填）" : ""}</span>
                  <input
                    type="date"
                    value={draft.nextReviewDate}
                    onChange={(e) => setDraft({ ...draft, nextReviewDate: e.target.value })}
                  />
                </label>
                <label>
                  <span>蹄铁类型</span>
                  <select
                    value={draft.shoeType}
                    onChange={(e) => setDraft({ ...draft, shoeType: e.target.value })}
                  >
                    {SHOE_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>钉位</span>
                  <input
                    placeholder="如：前蹄6钉 · 后蹄4钉"
                    value={draft.nailPositions}
                    onChange={(e) => setDraft({ ...draft, nailPositions: e.target.value })}
                  />
                </label>
              </div>

              <h3 className="section-title">四蹄形态评估</h3>
              <div className="hoof-grid">
                {HOOF_LABELS.map(({ key, label }) => (
                  <div key={key} className="hoof">
                    <strong>{label}</strong>
                    <select
                      value={draft.hooves[key].morphology}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          hooves: {
                            ...draft.hooves,
                            [key]: { ...draft.hooves[key], morphology: e.target.value },
                          },
                        })
                      }
                    >
                      {MORPHOLOGY_OPTIONS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <input
                      placeholder="补充说明（可选）"
                      value={draft.hooves[key].note}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          hooves: {
                            ...draft.hooves,
                            [key]: { ...draft.hooves[key], note: e.target.value },
                          },
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <h3 className="section-title">步态问题</h3>
              <div className="chips">
                {GAIT_OPTIONS.map((g) => (
                  <button
                    key={g}
                    className={draft.gaitIssues.includes(g) ? "chip active" : "chip"}
                    onClick={() => toggleGait(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <label className="block">
                <span>步态说明</span>
                <input
                  placeholder="如：慢步时轻微摇晃（可选）"
                  value={draft.gaitNote}
                  onChange={(e) => setDraft({ ...draft, gaitNote: e.target.value })}
                />
              </label>

              <label className="block">
                <span>照片备注（可后补）</span>
                <textarea
                  rows={2}
                  placeholder="可留空，保存后在历史记录中随时补充"
                  value={draft.photoNote}
                  onChange={(e) => setDraft({ ...draft, photoNote: e.target.value })}
                />
              </label>

              {draftEval.abnormal ? (
                <p className="alert warn">保存后将进入复查提醒：{draftEval.reasons.join("；")}</p>
              ) : (
                <p className="alert ok">四蹄评估一致且步态正常，保存后直接归档，不占复查提醒名额。</p>
              )}
              {message && <p className="alert info">{message}</p>}
            </>
          ) : (
            <p className="empty">请从左侧选择一匹马。</p>
          )}
        </section>
      </section>

      {selectedHorse && (
        <section className="panel">
          <div className="heading">
            <div>
              <p>档案历史</p>
              <h2>
                {selectedHorse.code} {selectedHorse.name} 的修蹄记录
              </h2>
            </div>
          </div>

          {horseShoeChanges.length > 0 && (
            <div className="shoe-history">
              <h3 className="section-title">蹄铁更换历史</h3>
              {horseShoeChanges.map((c) => (
                <p key={c.id} className="shoe-change">
                  <span className="badge accent">{c.date}</span> {c.from} → {c.to}
                </p>
              ))}
            </div>
          )}

          <div className="records">
            {horseRecords.length === 0 && <p className="empty">暂无修蹄记录。</p>}
            {horseRecords.map((r) => (
              <RecordItem
                key={r.id}
                record={r}
                onSavePhoto={savePhotoNote}
                onComplete={completeRecord}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function RecordItem({
  record,
  onSavePhoto,
  onComplete,
}: {
  record: HoofRecord;
  onSavePhoto: (recordId: string, note: string) => void;
  onComplete: (recordId: string, conclusion: string) => void;
}) {
  const [photoNote, setPhotoNote] = useState(record.photoNote);
  const [conclusion, setConclusion] = useState(record.reviewConclusion);
  const [hint, setHint] = useState("");

  useEffect(() => {
    setPhotoNote(record.photoNote);
    setConclusion(record.reviewConclusion);
  }, [record.photoNote, record.reviewConclusion]);

  const needsConclusion = record.abnormal && !record.completed;

  return (
    <article className={record.abnormal ? "record abnormal" : "record"}>
      <b>{record.trimDate.slice(5).replace("-", "/")}</b>
      <div>
        <h3>
          修蹄 {record.trimDate}
          {record.abnormal ? (
            <span className="badge warn">{record.completed ? "异常·已完成" : "异常·待复查"}</span>
          ) : (
            <span className="badge ok">正常·已归档</span>
          )}
        </h3>
        <p>
          {HOOF_LABELS.map(
            ({ key, label }) =>
              `${label}：${record.hooves[key].morphology}${
                record.hooves[key].note ? `（${record.hooves[key].note}）` : ""
              }`,
          ).join(" · ")}
        </p>
        <p>
          蹄铁：{record.shoeType} · 钉位：{record.nailPositions} · 下次复查：
          {record.nextReviewDate || "未安排"}
        </p>
        {record.gaitIssues.length > 0 && (
          <p>
            步态问题：{record.gaitIssues.join("、")}
            {record.gaitNote ? `（${record.gaitNote}）` : ""}
          </p>
        )}
        {record.abnormalReasons.length > 0 && (
          <p className="reasons">异常原因：{record.abnormalReasons.join("；")}</p>
        )}

        <div className="inline-edit">
          <label>
            <span>照片备注（可后补）</span>
            <textarea
              rows={2}
              placeholder="补充照片说明"
              value={photoNote}
              onChange={(e) => setPhotoNote(e.target.value)}
            />
          </label>
          <button
            disabled={photoNote.trim() === record.photoNote}
            onClick={() => onSavePhoto(record.id, photoNote.trim())}
          >
            保存备注
          </button>
        </div>

        {record.completed && record.reviewConclusion && (
          <p className="conclusion">复查结论：{record.reviewConclusion}</p>
        )}

        {needsConclusion && (
          <div className="inline-edit">
            <label>
              <span>复查结论（未填写不能完成本次记录）</span>
              <textarea
                rows={2}
                placeholder="填写复查结论后才能完成"
                value={conclusion}
                onChange={(e) => {
                  setConclusion(e.target.value);
                  setHint("");
                }}
              />
            </label>
            <button
              className="primary"
              onClick={() => {
                if (!conclusion.trim()) {
                  setHint("请先填写复查结论，再完成本次记录。");
                  return;
                }
                onComplete(record.id, conclusion);
              }}
            >
              完成记录
            </button>
          </div>
        )}
        {hint && <p className="alert warn">{hint}</p>}
      </div>
    </article>
  );
}

export default App;
