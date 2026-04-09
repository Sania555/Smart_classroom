import React, { useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import styles from './Reports.module.css';

export default function Reports() {
  const [filters, setFilters] = useState({ class: '', section: '', subject: '', from: '', to: '' });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [subjectReport, setSubjectReport] = useState([]);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
      const { data } = await api.get(`/reports/attendance?${params}`);
      setRecords(data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  const fetchSubjectReport = async () => {
    if (!filters.class || !filters.section) return toast.error('Enter class and section');
    setLoading(true);
    try {
      const { data } = await api.get(`/reports/subject-wise?class=${filters.class}&section=${filters.section}`);
      setSubjectReport(data);
    } catch { toast.error('Failed to load subject report'); }
    finally { setLoading(false); }
  };

  const downloadCSV = () => {
    const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), format: 'csv' });
    window.open(`/api/reports/attendance?${params}`, '_blank');
  };

  const downloadExcel = () => {
    if (!records.length) return toast.error('No data to export');
    const rows = records.map(r => ({
      Date: new Date(r.date).toLocaleDateString(),
      Student: r.studentId?.name,
      'Roll No': r.studentId?.rollNumber,
      Class: r.studentId?.class,
      Subject: r.timetableId?.subject,
      Status: r.status,
      Method: r.method || '',
      'Marked At': r.markedAt ? new Date(r.markedAt).toLocaleTimeString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, 'attendance_report.xlsx');
  };

  const statusColor = { present: '#16a34a', late: '#d97706', absent: '#dc2626' };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>📈 Attendance Reports</h2>

      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <input className={styles.input} placeholder="Class" value={filters.class} onChange={e => set('class', e.target.value)} />
          <input className={styles.input} placeholder="Section" value={filters.section} onChange={e => set('section', e.target.value)} />
          <input className={styles.input} placeholder="Subject" value={filters.subject} onChange={e => set('subject', e.target.value)} />
          <input className={styles.input} type="date" value={filters.from} onChange={e => set('from', e.target.value)} />
          <input className={styles.input} type="date" value={filters.to} onChange={e => set('to', e.target.value)} />
        </div>
        <div className={styles.filterBtns}>
          <button className={styles.btn} onClick={fetchReport} disabled={loading}>
            {loading ? 'Loading...' : '🔍 Generate Report'}
          </button>
          <button className={`${styles.btn} ${styles.btnGreen}`} onClick={fetchSubjectReport} disabled={loading}>
            📊 Subject-wise
          </button>
          {records.length > 0 && (
            <>
              <button className={`${styles.btn} ${styles.btnGray}`} onClick={downloadCSV}>⬇️ CSV</button>
              <button className={`${styles.btn} ${styles.btnGray}`} onClick={downloadExcel}>📊 Excel</button>
            </>
          )}
        </div>
      </div>

      {subjectReport.length > 0 && (
        <div className={styles.subjectReport}>
          <h3>Subject-wise Report — Class {filters.class}{filters.section}</h3>
          <div className={styles.subjectTable}>
            <div className={styles.subjectHeader}>
              <span>Student</span><span>Roll No</span>
              {Object.keys(subjectReport[0]?.subjects || {}).map(s => <span key={s}>{s}</span>)}
            </div>
            {subjectReport.map(({ student, subjects }) => (
              <div key={student.rollNumber} className={styles.subjectRow}>
                <span>{student.name}</span>
                <span>{student.rollNumber}</span>
                {Object.values(subjects).map((s, i) => (
                  <span key={i} style={{ color: s.percentage >= 75 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {s.percentage}%
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div className={styles.reportTable}>
          <div className={styles.tableHeader}>
            <span>Date</span><span>Student</span><span>Subject</span><span>Status</span><span>Method</span><span>Time</span>
          </div>
          {records.map(r => (
            <div key={r._id} className={styles.tableRow}>
              <span>{new Date(r.date).toLocaleDateString()}</span>
              <span>{r.studentId?.name}</span>
              <span>{r.timetableId?.subject}</span>
              <span><span className={styles.badge} style={{ background: statusColor[r.status] }}>{r.status}</span></span>
              <span>{r.method || '—'}</span>
              <span>{r.markedAt ? new Date(r.markedAt).toLocaleTimeString() : '—'}</span>
            </div>
          ))}
        </div>
      )}

      {!loading && records.length === 0 && subjectReport.length === 0 && (
        <div className={styles.empty}>Apply filters and generate a report</div>
      )}
    </div>
  );
}
