import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { loadModels, getFaceDescriptor, compareFaces, startVideoStream, stopVideoStream, captureFrame } from '../../services/faceService';
import toast from 'react-hot-toast';
import styles from './MarkAttendance.module.css';

export default function MarkAttendance() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [method, setMethod] = useState('face');
  const [otp, setOtp] = useState('');
  const [location, setLocation] = useState(null);
  const [stream, setStream] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    api.get('/timetable/today').then(r => setClasses(r.data));
    getLocation();
    return () => stopVideoStream(stream);
  }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => toast('Location unavailable - GPS validation skipped', { icon: '📍' })
      );
    }
  };

  const startCamera = async () => {
    try {
      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser. Try Chrome or Firefox.');
        return;
      }
      // Check permission state if API available
      if (navigator.permissions) {
        const perm = await navigator.permissions.query({ name: 'camera' });
        if (perm.state === 'denied') {
          toast.error(
            'Camera is blocked. Click the 🔒 icon in your address bar → Camera → Allow, then refresh.',
            { duration: 6000 }
          );
          return;
        }
      }
      await loadModels();
      const s = await startVideoStream(videoRef.current);
      setStream(s);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error(
          'Camera blocked. Click the 🔒 icon in address bar → Camera → Allow → Refresh page.',
          { duration: 7000 }
        );
      } else if (err.name === 'NotFoundError') {
        toast.error(
          'No camera found. Check: 1) Camera app is closed 2) Device Manager shows camera 3) Try unplugging/replugging if external webcam.',
          { duration: 8000 }
        );
      } else if (err.name === 'NotReadableError') {
        toast.error('Camera is in use by another app. Close it and try again.');
      } else {
        toast.error('Camera error: ' + err.message);
      }
    }
  };

  const stopCamera = () => {
    stopVideoStream(stream);
    setStream(null);
  };

  const handleFaceScan = async () => {
    if (!selected) return toast.error('Select a class first');
    setScanning(true);
    try {
      const canvas = captureFrame(videoRef.current, canvasRef.current);
      const descriptor = await getFaceDescriptor(canvas);
      if (!descriptor) {
        toast.error('No face detected. Please look directly at the camera.');
        setScanning(false);
        return;
      }

      // Block if student has no registered face descriptor
      if (!user.faceDescriptor || user.faceDescriptor.length === 0) {
        toast.error('Your face is not registered. Go to 🤳 Register Face first.');
        setScanning(false);
        return;
      }

      const { match, distance, score } = compareFaces(user.faceDescriptor, descriptor);
      console.log(`Face check — distance: ${distance.toFixed(3)}, score: ${(score * 100).toFixed(1)}%, match: ${match}`);

      if (!match) {
        toast.error(
          `Face not recognized (distance: ${distance.toFixed(2)}). Make sure you are in good lighting and looking at the camera.`,
          { duration: 5000 }
        );
        setScanning(false);
        return;
      }

      // Send live descriptor to backend for server-side verification too
      await submitAttendance('face', score, descriptor);
    } catch (err) {
      toast.error('Face scan failed: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleOTPSubmit = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter 6-digit OTP');
    await submitAttendance('otp', 0, null);
  };

  const submitAttendance = async (methodType, score, liveDescriptor) => {
    try {
      const { data } = await api.post('/attendance/mark', {
        timetableId: selected._id,
        method: methodType,
        faceMatchScore: score,
        liveDescriptor: liveDescriptor, // sent to backend for server-side verification
        location,
        otp: methodType === 'otp' ? otp : undefined,
      });
      setResult(data);
      stopCamera();
      toast.success(`Attendance marked as ${data.status}!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  if (result) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>{result.status === 'present' ? '✅' : result.status === 'late' ? '⏰' : '❌'}</div>
          <h2>Attendance {result.status === 'absent' ? 'Failed' : 'Marked!'}</h2>
          <p>Status: <strong style={{ textTransform: 'capitalize' }}>{result.status}</strong></p>
          <p>Time: {new Date(result.attendance.markedAt).toLocaleTimeString()}</p>
          <button className={styles.btn} onClick={() => setResult(null)}>Mark Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>📷 Mark Attendance</h2>

      <div className={styles.section}>
        <h3>Select Class</h3>
        {classes.length === 0 ? (
          <div className={styles.empty}>No classes today</div>
        ) : (
          <div className={styles.classList}>
            {classes.map(cls => (
              <div key={cls._id} className={`${styles.classItem} ${selected?._id === cls._id ? styles.selectedClass : ''}`}
                onClick={() => setSelected(cls)}>
                <strong>{cls.subject}</strong>
                <span>{cls.startTime} – {cls.endTime}</span>
                <span>{cls.classroom}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className={styles.section}>
          <h3>Method</h3>
          <div className={styles.methodTabs}>
            {['face', 'otp'].map(m => (
              <button key={m} className={`${styles.methodTab} ${method === m ? styles.activeMethod : ''}`}
                onClick={() => { setMethod(m); stopCamera(); }}>
                {m === 'face' ? '🤳 Face Recognition' : '🔑 OTP'}
              </button>
            ))}
          </div>

          {method === 'face' && (
            <div className={styles.cameraSection}>
              <video ref={videoRef} autoPlay muted className={styles.video} style={{ display: stream ? 'block' : 'none' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {!stream ? (
                <>
                  <button className={styles.btn} onClick={startCamera}>📷 Start Camera</button>
                  <p className={styles.cameraHint}>
                    Allow camera access when prompted.<br/>
                    If blocked, click the 🔒 icon in address bar → Camera → Allow → Refresh.
                  </p>
                </>
              ) : (
                <div className={styles.btnRow}>
                  <button className={styles.btn} onClick={handleFaceScan} disabled={scanning}>
                    {scanning ? 'Scanning...' : '✅ Scan Face'}
                  </button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={stopCamera}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {method === 'otp' && (
            <div className={styles.otpSection}>
              <input className={styles.otpInput} placeholder="Enter 6-digit OTP" maxLength={6}
                value={otp} onChange={e => setOtp(e.target.value)} />
              <button className={styles.btn} onClick={handleOTPSubmit}>Submit OTP</button>
            </div>
          )}

          {location && (
            <div className={styles.locationInfo}>
              📍 Location captured: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
