import React from 'react';
import styles from './ClassCard.module.css';

const dayColors = { Monday: '#4f46e5', Tuesday: '#0891b2', Wednesday: '#059669', Thursday: '#d97706', Friday: '#dc2626', Saturday: '#7c3aed' };

function formatTime(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function ClassCard({ cls, children, compact }) {
  const now = new Date();
  const [sh, sm] = cls.startTime.split(':').map(Number);
  const [eh, em] = cls.endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const isOngoing = currentMins >= startMins && currentMins <= endMins;
  const isUpcoming = currentMins < startMins && startMins - currentMins <= 60;

  return (
    <div className={`${styles.card} ${isOngoing ? styles.ongoing : ''} ${compact ? styles.compact : ''}`}>
      <div className={styles.colorBar} style={{ background: dayColors[cls.dayOfWeek] || '#4f46e5' }} />
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.subject}>{cls.subject}</span>
          {isOngoing && <span className={styles.badge} style={{ background: '#16a34a' }}>Live</span>}
          {isUpcoming && !isOngoing && <span className={styles.badge} style={{ background: '#d97706' }}>Soon</span>}
        </div>
        {!compact && (
          <>
            <div className={styles.meta}>⏰ {formatTime(cls.startTime)} – {formatTime(cls.endTime)} ({cls.duration} min)</div>
            <div className={styles.meta}>📍 {cls.classroom}</div>
            <div className={styles.meta}>👨‍🏫 {cls.teacherName}</div>
            <div className={styles.meta}>🏫 Class {cls.class}{cls.section}</div>
          </>
        )}
        {compact && <div className={styles.meta}>{formatTime(cls.startTime)} · {cls.classroom}</div>}
        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </div>
  );
}
