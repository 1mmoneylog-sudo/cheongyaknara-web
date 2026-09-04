import Link from "next/link";
import { useMemo, useState } from "react";
import noticesData from "../data/notices.json";
import { getDday, getUrgencyLevel } from "../lib/dday";
import NoticeCard from "../components/NoticeCard";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

function parseFlexibleDate(str) {
  if (!str) return null;
  const cleaned = String(str).replace(/[^0-9]/g, "");
  if (cleaned.length !== 8) return null;
  return new Date(`${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`);
}

function buildMonthGrid(year, month) {
  // month: 0-indexed
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // 월요일 시작 기준 오프셋
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const notices = useMemo(
    () =>
      noticesData.notices.map((n) => ({
        ...n,
        endDateObj: parseFlexibleDate(n.apply_end_date),
        dday: getDday(n.apply_end_date),
        urgency: getUrgencyLevel(getDday(n.apply_end_date)),
      })),
    []
  );

  const countByDay = useMemo(() => {
    const map = new Map();
    notices.forEach((n) => {
      if (!n.endDateObj) return;
      if (n.endDateObj.getFullYear() === year && n.endDateObj.getMonth() === month) {
        const d = n.endDateObj.getDate();
        map.set(d, (map.get(d) || 0) + 1);
      }
    });
    return map;
  }, [notices, year, month]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const listForSelection = useMemo(() => {
    return notices
      .filter((n) => {
        if (!n.endDateObj) return false;
        if (n.endDateObj.getFullYear() !== year || n.endDateObj.getMonth() !== month) return false;
        if (selectedDay) return n.endDateObj.getDate() === selectedDay;
        return true;
      })
      .sort((a, b) => (a.endDateObj?.getTime() ?? 0) - (b.endDateObj?.getTime() ?? 0));
  }, [notices, year, month, selectedDay]);

  function goPrevMonth() {
    setSelectedDay(null);
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    setSelectedDay(null);
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="dot" />
            청약나라
          </Link>
          <nav>
            <Link href="/">모집공고</Link>
            <Link href="/gajeom">가점계산기</Link>
            <Link href="/jagyeok">자격진단</Link>
            <Link href="/calendar" className="active">청약캘린더</Link>
            <Link href="/closed">마감공고</Link>
          </nav>
        </div>
      </header>

      <div className="tool-hero">
        <div className="tool-hero-inner">
          <h1>청약 캘린더</h1>
          <p>날짜를 클릭하면 그날 마감하는 공고만 모아볼 수 있어요.</p>
        </div>
      </div>

      <div className="layout" style={{ maxWidth: 800, display: "block" }}>
        <div className="calendar-nav">
          <button onClick={goPrevMonth}>‹</button>
          <div className="calendar-title">
            {year}년 {month + 1}월
          </div>
          <button onClick={goNextMonth}>›</button>
        </div>

        <div className="calendar-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="calendar-weekday">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            const count = d ? countByDay.get(d) : 0;
            const isToday = isCurrentMonth && d === today.getDate();
            return (
              <button
                key={i}
                className={`calendar-cell ${d ? "" : "empty"} ${selectedDay === d ? "selected" : ""} ${isToday ? "today" : ""}`}
                disabled={!d}
                onClick={() => setSelectedDay(selectedDay === d ? null : d)}
              >
                {d && <span className="calendar-daynum">{d}</span>}
                {count > 0 && <span className="calendar-dot">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="result-count" style={{ marginTop: 20 }}>
          {selectedDay ? `${month + 1}월 ${selectedDay}일 마감 공고` : `${month + 1}월 전체 마감 공고`} —{" "}
          <b>{listForSelection.length}</b>건
        </div>

        {listForSelection.length === 0 && <div className="empty-state">해당하는 공고가 없습니다.</div>}

        {listForSelection.map((n) => (
          <NoticeCard key={n.id} notice={n} />
        ))}
      </div>
    </div>
  );
}
