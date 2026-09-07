import { useState, useMemo } from "react";
import Link from "next/link";
import noticesData from "../data/notices.json";

// 유형별 대표 색상 지정 (청약홈 스타일)
const TYPE_COLORS = {
  "특별공급": { bg: "#3B82F6", text: "#FFFFFF" }, // 파랑
  "1순위": { bg: "#22C55E", text: "#FFFFFF" },   // 초록
  "2순위": { bg: "#F97316", text: "#FFFFFF" },   // 주황
  "당첨자발표": { bg: "#A855F7", text: "#FFFFFF" }, // 보라
  "기타": { bg: "#64748B", text: "#FFFFFF" },    // 회색
};

export default function CalendarPage() {
  const notices = noticesData.notices || [];

  // 2026년 9월 기본 설정 (필요 시 현재 날짜 기준 변경 가능)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(9); // 1 ~ 12
  const [selectedType, setSelectedType] = useState("전체");

  // 이전/다음 월 이동
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((prev) => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((prev) => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // 해당 월의 달력 그리드 계산 (1일의 요일, 총 일수)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0(일) ~ 6(토)
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];
    // 이전 달 빈 칸
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // 현재 달 일자
    for (let d = 1; d <= totalDays; d++) {
      days.push(d);
    }
    return days;
  }, [currentYear, currentMonth]);

  // 날짜별 이벤트 매핑
  const eventsByDate = useMemo(() => {
    const map = {};

    notices.forEach((n) => {
      // apply_start_date, apply_end_date 등을 사용해 일정 매핑 (YYYY-MM-DD 또는 YYYYMMDD 형식 고려)
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
          type: n.supply_kind === "분양" ? "1순위" : "특별공급", // 예시 매핑
        });
      }
    });

    return map;
  }, [notices, currentYear, currentMonth]);

  return (
    <div className="bg-light-gray min-h-screen">
      {/* 헤더 */}
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

      {/* 캘린더 메인 컨테이너 */}
      <div className="calendar-page-container">
        {/* 상단 월 선택 컨트롤러 */}
        <div className="calendar-header-bar">
          <div className="month-picker">
            <button onClick={handlePrevMonth} className="nav-btn">‹</button>
            <span className="current-month-text">{currentYear}.{String(currentMonth).padStart(2, "0")}</span>
            <button onClick={handleNextMonth} className="nav-btn">›</button>
          </div>

          {/* 월 선택 탭 (1월 ~ 12월) */}
          <div className="month-tabs">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button
                key={m}
                className={`month-tab-btn ${m === currentMonth ? "active" : ""}`}
                onClick={() => setCurrentMonth(m)}
              >
                {m}월
              </button>
            ))}
          </div>
        </div>

        {/* 범례 및 유형 필터 */}
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

        {/* 청약홈 스타일 달력 그리드 */}
        <div className="ch-calendar-grid">
          {/* 요일 헤더 */}
          {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
            <div key={day} className={`ch-weekday-header ${idx === 0 ? "sun" : idx === 6 ? "sat" : ""}`}>
              {day}
            </div>
          ))}

          {/* 일자 셀 */}
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
    </div>
  );
}
