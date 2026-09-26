import { useMemo, useState } from "react";
import { fmtDate, daysUntil } from "../constants";
import { horseStatuses, type HorseStatus } from "../logic";
import type { ArchiveData, HorseUsage } from "../types";

interface Props {
  data: ArchiveData;
  onOpenHorse: (horseId: string, recordId?: string) => void;
  onAddHorse: (code: string, name: string, usage: HorseUsage) => void;
  onReset: () => void;
}

type QuickFilter = "" | "open" | "gait";

export default function HorseList({ data, onOpenHorse, onAddHorse, onReset }: Props) {
  const [quick, setQuick] = useState<QuickFilter>("");
  const [usage, setUsage] = useState<"" | HorseUsage>("");
  const [keyword, setKeyword] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [newUsage, setNewUsage] = useState<HorseUsage>("运动马");
  const [addError, setAddError] = useState("");

  const statuses = useMemo(() => horseStatuses(data.horses, data.records), [data]);

  const openCount = statuses.reduce((n, s) => n + s.open.length, 0);
  const gaitHorseCount = statuses.filter((s) => s.hasGait).length;
  const overdueCount = useMemo(
    () =>
      statuses.reduce(
        (n, s) => n + s.open.filter((r) => daysUntil(r.nextCheckDate) < 0).length,
        0,
      ),
    [statuses],
  );

  const filtered = statuses.filter((s) => {
    if (quick === "open" && s.open.length === 0) return false;
    if (quick === "gait" && !s.hasGait) return false;
    if (usage && s.horse.usage !== usage) return false;
    const kw = keyword.trim().toLowerCase();
    if (kw && !`${s.horse.code} ${s.horse.name}`.toLowerCase().includes(kw)) return false;
    return true;
  });

  function submitAdd() {
    const c = code.trim();
    if (!c) {
      setAddError("请填写马匹编号");
      return;
    }
    if (data.horses.some((h) => h.code.toLowerCase() === c.toLowerCase())) {
      setAddError("该马匹编号已存在");
      return;
    }
    onAddHorse(c, name.trim() || c, newUsage);
    setCode("");
    setName("");
    setNewUsage("运动马");
    setAddError("");
    setShowAdd(false);
  }

  return (
    <div className="list-view">
      <section className="metrics">
        <article className={`metric clickable ${quick === "open" ? "active" : ""}`} onClick={() => setQuick(quick === "open" ? "" : "open")}>
          <small>待复查（提醒名额）</small>
          <strong>{openCount}</strong>
          {overdueCount > 0 && <em className="overdue">已逾期 {overdueCount}</em>}
        </article>
        <article className={`metric clickable ${quick === "gait" ? "active" : ""}`} onClick={() => setQuick(quick === "gait" ? "" : "gait")}>
          <small>异常步态马匹</small>
          <strong>{gaitHorseCount}</strong>
        </article>
        <article className="metric">
          <small>马匹档案</small>
          <strong>{data.horses.length}</strong>
        </article>
        <article className="metric">
          <small>修蹄记录总数</small>
          <strong>{data.records.length}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>档案台</p>
            <h2>马匹列表</h2>
          </div>
          <div className="heading-actions">
            <button className="ghost" onClick={onReset} title="清空本地保存并恢复示例档案">
              重置示例数据
            </button>
            <button className="primary" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? "取消" : "新增马匹"}
            </button>
          </div>
        </div>

        {showAdd && (
          <div className="add-horse box-soft">
            <label>
              <span>马匹编号 *</span>
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="如 HORSE-42" />
            </label>
            <label>
              <span>马名（可留空）</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如 黑风" />
            </label>
            <label>
              <span>用途</span>
              <select value={newUsage} onChange={(e) => setNewUsage(e.target.value as HorseUsage)}>
                <option>运动马</option>
                <option>休养马</option>
              </select>
            </label>
            <div className="add-horse-action">
              {addError && <p className="error-text">{addError}</p>}
              <button className="primary" onClick={submitAdd}>
                建立档案
              </button>
            </div>
          </div>
        )}

        <div className="filter-bar">
          <div className="chips">
            <button className={quick === "open" ? "selected" : ""} onClick={() => setQuick(quick === "open" ? "" : "open")}>
              待复查
            </button>
            <button className={quick === "gait" ? "selected" : ""} onClick={() => setQuick(quick === "gait" ? "" : "gait")}>
              异常步态
            </button>
            <span className="chip-divider" />
            <button className={usage === "运动马" ? "selected" : ""} onClick={() => setUsage(usage === "运动马" ? "" : "运动马")}>
              运动马
            </button>
            <button className={usage === "休养马" ? "selected" : ""} onClick={() => setUsage(usage === "休养马" ? "" : "休养马")}>
              休养马
            </button>
          </div>
          <input
            className="search"
            placeholder="搜索马匹编号 / 马名"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="horse-grid">
          {filtered.map((s) => (
            <HorseCard key={s.horse.id} status={s} onOpen={() => onOpenHorse(s.horse.id)} />
          ))}
          {filtered.length === 0 && <p className="empty-hint">没有符合筛选条件的马匹。</p>}
        </div>
      </section>
    </div>
  );
}

function HorseCard({ status, onOpen }: { status: HorseStatus; onOpen: () => void }) {
  const { horse, open, hasGait, latest, total } = status;
  const soonest = open
    .map((r) => r.nextCheckDate)
    .filter(Boolean)
    .sort()[0];
  const dleft = soonest ? daysUntil(soonest) : Infinity;

  return (
    <article className={`horse-card ${open.length > 0 ? "has-open" : ""}`} onClick={onOpen}>
      <div className="horse-card-head">
        <div>
          <h3>{horse.code}</h3>
          <p className="horse-name">{horse.name}</p>
        </div>
        <span className="tag usage">{horse.usage}</span>
      </div>

      <div className="badges">
        {open.length > 0 ? (
          <span className={`badge ${dleft < 0 ? "danger" : dleft <= 3 ? "warn" : "info"}`}>
            待复查 {open.length} · {dleft < 0 ? `逾期 ${-dleft} 天` : `${dleft} 天内`}
          </span>
        ) : (
          <span className="badge ok">无待复查</span>
        )}
        {hasGait && <span className="badge danger">异常步态史</span>}
      </div>

      <dl className="horse-meta">
        <div>
          <dt>最近修蹄</dt>
          <dd>{latest ? fmtDate(latest.date) : "暂无记录"}</dd>
        </div>
        <div>
          <dt>下次复查</dt>
          <dd>{soonest ? fmtDate(soonest) : "—"}</dd>
        </div>
        <div>
          <dt>档案记录</dt>
          <dd>{total} 次</dd>
        </div>
      </dl>
    </article>
  );
}
