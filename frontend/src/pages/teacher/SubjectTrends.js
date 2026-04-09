import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import styles from './SubjectTrends.module.css';

const COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777'];

function MiniChart({ trend, color }) {
  if (!trend || trend.length === 0) return <div className={styles.noData}>No data</div>;
  const max = Math.max(...trend.map(t => t.total), 1);
  return (
    <div className={styles.chart}>
      {trend.slice(-20).map((t, i) => {
        const pct = t.total ? (t.present / t.total) * 100 : 0;
        return (
          <div key={i} className={styles.bar} title={`${t.date}: ${Math.round(pct)}%`}>
            <div className={styles.barFill} style={{ height: `${pct}%`, background: pct >= 75 ? color : '#f87171' }} />
          </div>
        );
      })}
    </div>
  );
}

export default function SubjectTrends() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance/subject-trend').then(r => setTrends(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>📉 Subject Attendance Trends</h2>
      {trends.length === 0 ? (
        <div className={styles.empty}>No trend data available</div>
      ) : (
        <div className={styles.grid}>
          {trends.map((t, i) => {
            const color = COLORS[i % COLORS.length];
            const allRecords = t.trend.reduce((s, d) => ({ present: s.present + d.present, total: s.total + d.total }), { present: 0, total: 0 });
            const overallPct = allRecords.total ? Math.round((allRecords.present / allRecords.total) * 100) : 0;
            return (
              <div key={t.timetableId} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.dot} style={{ background: color }} />
                  <strong>{t.subject}</strong>
                  <span className={styles.pct} style={{ color: overallPct >= 75 ? '#16a34a' : '#dc2626' }}>{overallPct}%</span>
                </div>
                <div className={styles.meta}>{t.trend.length} sessions recorded</div>
                <MiniChart trend={t.trend} color={color} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
