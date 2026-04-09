import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import styles from './LeaveRequests.module.css';

const statusColor = { pending: '#d97706', approved: '#16a34a', rejected: '#dc2626' };

function ReviewModal({ item, type, onClose, onDone }) {
  const [status, setStatus] = useState('approved');
  const [comment, setComment] = useState('');

  const submit = async () => {
    try {
      await api.put(`/leave/${type}/${item._id}/review`, { status, teacherComment: comment });
      toast.success(`${type === 'leave' ? 'Leave' : 'Dispute'} ${status}`);
      onDone();
    } catch { toast.error('Failed to review'); }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3>Review {type === 'leave' ? 'Leave Request' : 'Dispute'}</h3>
        <p><strong>{item.studentId?.name}</strong> ({item.studentId?.rollNumber})</p>
        <p>{item.timetableId?.subject} · {new Date(item.date).toLocaleDateString()}</p>
        <p className={styles.reason}>{item.reason}</p>
        <div className={styles.statusBtns}>
          <button className={`${styles.statusBtn} ${status === 'approved' ? styles.approved : ''}`} onClick={() => setStatus('approved')}>✅ Approve</button>
          <button className={`${styles.statusBtn} ${status === 'rejected' ? styles.rejected : ''}`} onClick={() => setStatus('rejected')}>❌ Reject</button>
        </div>
        <textarea className={styles.textarea} placeholder="Comment (optional)" rows={3} value={comment} onChange={e => setComment(e.target.value)} />
        <div className={styles.modalBtns}>
          <button className={styles.btn} onClick={submit}>Submit</button>
          <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function LeaveRequests() {
  const [tab, setTab] = useState('leave');
  const [leaves, setLeaves] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [reviewing, setReviewing] = useState(null);

  const fetchAll = () => {
    api.get('/leave/leave/class').then(r => setLeaves(r.data));
    api.get('/leave/dispute/class').then(r => setDisputes(r.data));
  };

  useEffect(() => { fetchAll(); }, []);

  const items = tab === 'leave' ? leaves : disputes;

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>📋 Leave & Disputes</h2>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'leave' ? styles.active : ''}`} onClick={() => setTab('leave')}>
          Leave Requests <span className={styles.count}>{leaves.filter(l => l.status === 'pending').length}</span>
        </button>
        <button className={`${styles.tab} ${tab === 'dispute' ? styles.active : ''}`} onClick={() => setTab('dispute')}>
          Disputes <span className={styles.count}>{disputes.filter(d => d.status === 'pending').length}</span>
        </button>
      </div>

      <div className={styles.list}>
        {items.length === 0 ? <div className={styles.empty}>No {tab === 'leave' ? 'leave requests' : 'disputes'}</div> : items.map(item => (
          <div key={item._id} className={styles.item}>
            <div className={styles.itemInfo}>
              <strong>{item.studentId?.name} <span className={styles.roll}>({item.studentId?.rollNumber})</span></strong>
              <span>{item.timetableId?.subject} · {new Date(item.date).toLocaleDateString()}</span>
              <span className={styles.reason}>{item.reason}</span>
              {item.teacherComment && <span className={styles.comment}>Your comment: {item.teacherComment}</span>}
            </div>
            <div className={styles.itemRight}>
              <span className={styles.badge} style={{ background: statusColor[item.status] }}>{item.status}</span>
              {item.status === 'pending' && (
                <button className={styles.reviewBtn} onClick={() => setReviewing(item)}>Review</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {reviewing && (
        <ReviewModal
          item={reviewing}
          type={tab}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); fetchAll(); }}
        />
      )}
    </div>
  );
}
