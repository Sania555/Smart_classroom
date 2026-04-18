import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import ClassCard from '../../components/ClassCard';
import styles from './Timetable.module.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetable() {
  const [timetable, setTimetable] = useState([]);
  const [activeDay, setActiveDay] = useState(getCurrentDay());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/timetable/my').then(r => setTimetable(r.data)).finally(() => setLoading(false));
  }, []);

  const dayClasses = timetable.filter(c => c.dayOfWeek === activeDay);

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>📅 My Timetable</h2>
      <div className={styles.dayTabs}>
        {DAYS.map(d => (
          <button key={d} className={`${styles.dayTab} ${activeDay === d ? styles.active : ''}`}
            onClick={() => setActiveDay(d)}>
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      {loading ? <div className={styles.loading}>Loading...</div> : (
        dayClasses.length === 0 ? (
          <div className={styles.empty}>No classes on {activeDay}</div>
        ) : (
          dayClasses.map(cls => <ClassCard key={cls._id} cls={cls} />)
        )
      )}
    </div>
  );
}

function getCurrentDay() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = days[new Date().getDay()];
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].includes(d) ? d : 'Monday';
}
