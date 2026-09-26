import { useEffect, useState } from "react";
import "./styles.css";
import HorseList from "./components/HorseList";
import HorseDetail from "./components/HorseDetail";
import Reminders from "./components/Reminders";
import { loadData, saveData } from "./storage";
import { uid } from "./constants";
import type { ArchiveData, HorseUsage, TrimRecord } from "./types";
import type { RecordInput } from "./components/RecordForm";
import { allOpenRecords } from "./logic";

type View = { page: "list" } | { page: "horse"; horseId: string; recordId?: string } | { page: "reminders" };

export default function App() {
  const [data, setData] = useState<ArchiveData>(() => loadData());
  const [view, setView] = useState<View>({ page: "list" });

  // 保存过的档案写入本地，重新打开页面仍能找到
  useEffect(() => {
    saveData(data);
  }, [data]);

  const openCount = allOpenRecords(data.records).length;

  function addHorse(code: string, name: string, usage: HorseUsage) {
    const horse = { id: uid("horse"), code, name, usage, createdAt: Date.now() };
    setData((d) => ({ ...d, horses: [...d.horses, horse] }));
    setView({ page: "horse", horseId: horse.id });
  }

  function saveRecord(horseId: string, input: RecordInput) {
    const record: TrimRecord = {
      id: uid("rec"),
      horseId,
      date: input.date,
      isFollowUp: input.isFollowUp,
      resolvesRecordId: input.resolvesRecordId,
      gait: { abnormal: input.gaitAbnormal, problem: input.gaitProblem },
      hooves: input.hooves,
      nextCheckDate: input.nextCheckDate,
      reasons: input.reasons,
      conclusion: input.conclusion,
      photoNote: input.photoNote,
      createdAt: Date.now(),
    };
    setData((d) => ({ ...d, records: [...d.records, record] }));
  }

  function savePhotoNote(recordId: string, note: string) {
    setData((d) => ({
      ...d,
      records: d.records.map((r) => (r.id === recordId ? { ...r, photoNote: note } : r)),
    }));
  }

  function resetData() {
    if (!window.confirm("确定清空当前档案并恢复示例数据？")) return;
    localStorage.removeItem("farrier-archive-v1");
    const fresh = loadData();
    setData(fresh);
    setView({ page: "list" });
  }

  const currentHorse =
    view.page === "horse" ? data.horses.find((h) => h.id === view.horseId) : undefined;

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand" onClick={() => setView({ page: "list" })}>
          <span className="brand-mark">蹄</span>
          <div>
            <h1>马术蹄铁修整档案台</h1>
            <small>四蹄对比 · 步态标记 · 复查提醒 · 蹄铁更换史</small>
          </div>
        </div>
        <nav className="main-nav">
          <button
            className={view.page === "list" ? "active" : ""}
            onClick={() => setView({ page: "list" })}
          >
            马匹列表
          </button>
          <button
            className={view.page === "reminders" ? "active" : ""}
            onClick={() => setView({ page: "reminders" })}
          >
            复查提醒{openCount > 0 && <span className="nav-dot">{openCount}</span>}
          </button>
        </nav>
      </header>

      {view.page === "list" && (
        <HorseList
          data={data}
          onOpenHorse={(horseId, recordId) => setView({ page: "horse", horseId, recordId })}
          onAddHorse={addHorse}
          onReset={resetData}
        />
      )}

      {view.page === "reminders" && (
        <Reminders
          data={data}
          onOpenHorse={(horseId, recordId) => setView({ page: "horse", horseId, recordId })}
        />
      )}

      {view.page === "horse" && currentHorse && (
        <HorseDetail
          horse={currentHorse}
          data={data}
          initialRecordId={view.recordId}
          onBack={() => setView({ page: "list" })}
          onSaveRecord={saveRecord}
          onSavePhotoNote={savePhotoNote}
        />
      )}

      <footer className="footnote">
        档案保存在本机浏览器中，刷新或重新打开页面不会丢失；正常记录不占用复查提醒名额。
      </footer>
    </main>
  );
}
