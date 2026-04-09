import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import styles from './AttendanceHeatmap.module.css';

const MONTHS = 3;

function getColor(day) {
  if (!day) return 'var(--border)';
  const { present, late, absent, total } = day;
  if (total === 0) return 'var(--border)';
  const pct = ((present + late) / total) * 100;
  if (pct === 100) return '#16a34a';
  if (pct >= 75) return '#4ade80';
  if (pct >= 50) return '#fbbf24';
  if (pct > 0) return '#f87171';
  return '#dc2626';
}

function buildCalendar(data) {
  const map = {};
  data.forEach(d => { map[d.date] = d; });

  const today = new Date();
  const start = new Date(today);
  start.setMonth(start.getMonth() - MONTHS);
  start.setDate(1);

  const weeks = [];
  let current = new Date(start);
  // align to Sunday
  current.setDate(current.getDate() - current.getDay());

  while (current <= today) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const key = current.toISOString().split('T')[0];
      week.push({ date: key, data: map[key] || null, inRange: current >= start && current <= today });
      current = new Date(current); current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export default function AttendanceHeatmap() {
  const [data, setData] = useState([]);
  const [tooltip, setTooltip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/attendance/heatmap?months=${MONTHS}`).then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const weeks = buildCalendar(data);
  const total = data.reduce((s, d) => s + d.total, 0);
  const present = data.reduce((s, d) => s + d.present + d.late, 0);
  const pct = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>🗓 Attendance Heatmap</h2>
      <p className={styles.sub}>Last {MONTHS} months — Overall: <strong style={{ color: pct >= 75 ? '#16a34a' : '#dc2626' }}>{pct}%</strong> ({present}/{total} classes)</p>

      {loading ? <div className={styles.loading}>Loading...</div> : (
        <div className={styles.card}>
          <div className={styles.dayLabels}>
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className={styles.grid}>
            {weeks.map((week, wi) => (
              <div key={wi} className={styles.week}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={styles.cell}
                    style={{ background: day.inRange ? getColor(day.data) : 'transparent', opacity: day.inRange ? 1 : 0 }}
                    onMouseEnter={e => day.inRange && setTooltip({ ...day, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className={styles.legend}>
            <span>Less</span>
            {['#dc2626','#f87171','#fbbf24','#4ade80','#16a34a'].map(c => (
              <div key={c} className={styles.legendCell} style={{ background: c }} />
            ))}
            <span>More</span>
          </div>
        </div>
      )}

      {tooltip && tooltip.data && (
        <div className={styles.tooltip} style={{ top: tooltip.y + 12, left: tooltip.x + 12 }}>
          <strong>{tooltip.date}</strong>
          <div>✅ Present: {tooltip.data.present}</div>
          <div>⏰ Late: {tooltip.data.late}</div>
          <div>❌ Absent: {tooltip.data.absent}</div>
          <div>Total: {tooltip.data.total}</div>
        </div>
      )}
    </div>
  );
}
