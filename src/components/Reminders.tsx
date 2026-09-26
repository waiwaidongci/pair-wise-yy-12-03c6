import { useMemo } from "react";
import { daysUntil, fmtDate, HOOF_LABELS, HOOF_ORDER } from "../constants";
import { allOpenRecords } from "../logic";
import type { ArchiveData } from "../types";

interface Props {
  data: ArchiveData;
  onOpenHorse: (horseId: string, recordId?: string) => void;
}

export default function Reminders({ data, onOpenHorse }: Props) {
  const open = useMemo(() => allOpenRecords(data.records), [data.records]);

  const horseOf = (id: string) => data.horses.find((h) => h.id === id);
  const overdue = open.filter((r) => daysUntil(r.nextCheckDate) < 0);
  const todayDue = open.filter((r) => daysUntil(r.nextCheckDate) === 0);

  return (
    <section className="panel reminders-panel">
      <div className="heading">
        <div>
          <p>复查提醒</p>
          <h2>待复查队列</h2>
        </div>
        <div className="reminder-counts">
          <span className="badge danger">逾期 {overdue.length}</span>
          <span className="badge warn">今天 {todayDue.length}</span>
          <span className="badge info">全部 {open.length}</span>
        </div>
      </div>

      {open.length === 0 ? (
        <p className="empty-hint">当前没有待复查记录——正常记录不占用提醒名额。</p>
      ) : (
        <div className="reminder-list">
          {open.map((r) => {
            const horse = horseOf(r.horseId);
            const d = daysUntil(r.nextCheckDate);
            return (
              <article
                key={r.id}
                className={`reminder-item ${d < 0 ? "overdue" : d === 0 ? "today" : ""}`}
                onClick={() => onOpenHorse(r.horseId, r.id)}
              >
                <div className="reminder-main">
                  <h3>{horse?.code ?? "未知马匹"} <small>{horse?.name}</small></h3>
                  <p>{r.reasons.join("；")}</p>
                  {r.gait.abnormal && <p className="danger-text">步态：{r.gait.problem}</p>}
                  <div className="reminder-hooves">
                    {HOOF_ORDER.map((pos) => (
                      <span key={pos}>
                        {HOOF_LABELS[pos]}：{r.hooves[pos].shape}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="reminder-side">
                  <span className={`due ${d < 0 ? "danger-text" : d <= 3 ? "warn-text" : ""}`}>
                    {d < 0 ? `逾期 ${-d} 天` : d === 0 ? "今天到期" : `还剩 ${d} 天`}
                  </span>
                  <small>
                    修蹄 {fmtDate(r.date)} → 复查 {fmtDate(r.nextCheckDate)}
                  </small>
                  <button className="primary small">去复查</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
