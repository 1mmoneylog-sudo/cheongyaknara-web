import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import noticesData from "../data/notices.json";

const TYPE_COLORS = {
  "특별공급": { bg: "#3B82F6", text: "#FFFFFF" },
  "1순위": { bg: "#22C55E", text: "#FFFFFF" },
  "2순위": { bg: "#F97316", text: "#FFFFFF" },
  "당첨자발표": { bg: "#A855F7", text: "#FFFFFF" },
  "기타": { bg: "#64748B", text: "#FFFFFF" },
};

export default function CalendarPage() {
  const notices = noticesData.notices || [];

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedType, setSelectedType] = useState("전체");
  const [selectedDay, setSelectedDay] = useState(today.getDate());

   const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((prev) => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((prev) => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDay(1);
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [currentYear, currentMonth]);

  const totalDaysInMonth = useMemo(
    () => new Date(currentYear, currentMonth, 0).getDate(),
    [currentYear, currentMonth]
  );

  const eventsByDate = useMemo(() => {
    const map = {};
    notices.forEach((n) => {
      if (!n.apply_start_date) return;
      const cleanStart = String(n.apply_start_date).replace(/[^0-9]/g, "");
      if (cleanStart.length !== 8) return;
      const y = parseInt(cleanStart.slice(0, 4));
      const m = parseInt(cleanStart.slice(4, 6));
      const d = parseInt(cleanStart.slice(6, 8));
      if (y === currentYear && m === currentMonth) {
        if (!map[d]) map[d] = [];
        map[d].push({
          id: n.id,
          title: n.title,
          agency: n.source_agency,
          apply_end_date: n.apply_end_date,
          type: n.supply_kind === "분양" ? "1순위" : "특별공급",
        });
      }
    });
    return map;
  }, [notices, currentYear, currentMonth]);

  // 요일 배열 (모바일 가로 날짜 스크롤용)
  const dayList = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
    const list = [];
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dow = weekLabels[(firstDay + d - 1) % 7];
      list.push({ day: d, dow, count: (eventsByDate[d] || []).length });
    }
    return list;
  }, [currentYear, currentMonth, totalDaysInMonth, eventsByDate]);

    const dayScrollRef = useRef(null);

  // 선택된 날짜가 바뀌면(특히 처음 들어왔을 때 오늘 날짜로) 그 위치가 화면 가운데 보이도록 자동 스크롤
  useEffect(() => {
    if (!dayScrollRef.current) return;
    const activeEl = dayScrollRef.current.querySelector(`[data-day="${selectedDay}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
    }
  }, [selectedDay, currentMonth, currentYear]);

  const selectedDayEvents = eventsByDate[selectedDay] || [];
  const filteredDayEvents =
    selectedType === "전체"
      ? selectedDayEvents
      : selectedDayEvents.filter((e) => e.type === selectedType);

  return (
    <div className="bg-light-gray min-h-screen">
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="logo">
            <span className="dot" /> 청약나라
          </Link>
          <nav>
            <Link href="/">모집공고</Link>
            <Link href="/gajeom">가점계산기</Link>
            <Link href="/jagyeok">자격진단</Link>
            <Link href="/calendar" className="active">청약캘린더</Link>
          </nav>
        </div>
      </header>

      <div className="calendar-page-container">
        <div className="calendar-header-bar">
          <div className="month-picker">
            <button onClick={handlePrevMonth} className="nav-btn">‹</button>
            <span className="current-month-text">
              {currentYear}.{String(currentMonth).padStart(2, "0")}
            </span>
            <button onClick={handleNextMonth} className="nav-btn">›</button>
          </div>

          <div className="month-tabs">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button
                key={m}
                className={`month-tab-btn ${m === currentMonth ? "active" : ""}`}
                onClick={() => {
                  setCurrentMonth(m);
                  setSelectedDay(1);
                }}
              >
                {m}월
              </button>
            ))}
          </div>
        </div>

        <div className="calendar-legend-bar">
          {Object.entries(TYPE_COLORS).map(([typeName, color]) => (
            <button
              key={typeName}
              className={`legend-item ${selectedType === typeName ? "active" : ""}`}
              onClick={() => setSelectedType(selectedType === typeName ? "전체" : typeName)}
            >
              <span className="legend-badge" style={{ backgroundColor: color.bg }} />
              <span className="legend-label">{typeName}</span>
            </button>
          ))}
        </div>

        {/* ===== PC: 한 달 그리드 뷰 ===== */}
        <div className="desktop-calendar-view">
          <div className="ch-calendar-grid">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
              <div key={day} className={`ch-weekday-header ${idx === 0 ? "sun" : idx === 6 ? "sat" : ""}`}>
                {day}
              </div>
            ))}
            {calendarDays.map((dayNum, idx) => {
              const dayEvents = dayNum ? eventsByDate[dayNum] || [] : [];
              const isSunday = idx % 7 === 0;
              const isSaturday = idx % 7 === 6;
              return (
                <div key={idx} className={`ch-calendar-cell ${!dayNum ? "empty" : ""}`}>
                  {dayNum && (
                    <>
                      <div className={`ch-day-number ${isSunday ? "sun" : isSaturday ? "sat" : ""}`}>
                        {dayNum}
                      </div>
                      <div className="ch-event-list">
                        {dayEvents.map((evt, i) => {
                          const style = TYPE_COLORS[evt.type] || TYPE_COLORS["기타"];
                          return (
                            <div
                              key={i}
                              className="ch-event-bar"
                              style={{ backgroundColor: style.bg, color: style.text }}
                              title={evt.title}
                            >
                              <span className="evt-agency">[{evt.agency}]</span>
                              <span className="evt-title">{evt.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== 모바일: 가로 날짜 스크롤 + 하단 리스트 뷰 ===== */}
        <div className="mobile-calendar-view">
                    <div className="mobile-day-scroll" ref={dayScrollRef}>
            {dayList.map(({ day, dow, count }) => (
              <button
                key={day}
                data-day={day}
                className={`mobile-day-item ${day === selectedDay ? "active" : ""}`}
                onClick={() => setSelectedDay(day)}
              >
                <div className="dow">{dow}</div>
                <div className="num">{String(day).padStart(2, "0")}</div>
                <div className="cnt">{count > 0 ? `${count}/${count}건` : "-"}</div>
              </button>
            ))}
          </div>

          <div className="mobile-event-list">
            {filteredDayEvents.length === 0 ? (
              <div className="mobile-empty-day">이 날짜에는 공고가 없습니다.</div>
            ) : (
              filteredDayEvents.map((evt, i) => {
                const style = TYPE_COLORS[evt.type] || TYPE_COLORS["기타"];
                return (
                  <Link href={`/notice/${evt.id}`} key={i} className="mobile-event-row">
                    <span
                      className="mobile-event-badge"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {evt.type}
                    </span>
                    <span className="mobile-event-title">
                      [{evt.agency}] {evt.title}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
