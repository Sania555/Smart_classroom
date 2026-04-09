import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { loadModels, getFaceDescriptor, compareFaces, startVideoStream, stopVideoStream, captureFrame } from '../../services/faceService';
import toast from 'react-hot-toast';
import styles from './MarkAttendance.module.css';

function formatTime(time24) {
  if (!time24) return '';
  const [h, m] = time24.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function MarkAttendance() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [method, setMethod] = useState('face');
  const [otp, setOtp] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [location, setLocation] = useState(null);
  const [stream, setStream] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const qrVideoRef = useRef(null);
  const qrScannerRef = useRef(null);

  useEffect(() => {
    api.get('/timetable/today').then(r => setClasses(r.data));
    getLocation();
    return () => {
      stopVideoStream(stream);
      if (qrScannerRef.current) { qrScannerRef.current.stop(); qrScannerRef.current.destroy(); }
    };
  }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => toast.error('GPS unavailable. Location is required for attendance — enable it and refresh.', { duration: 5000 })
      );
    } else {
      toast.error('Geolocation not supported by this browser.');
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera not supported in this browser. Try Chrome or Firefox.');
        return;
      }
      if (navigator.permissions) {
        const perm = await navigator.permissions.query({ name: 'camera' });
        if (perm.state === 'denied') {
          toast.error('Camera is blocked. Click the 🔒 icon → Camera → Allow, then refresh.', { duration: 6000 });
          return;
        }
      }
      await loadModels();
      const s = await startVideoStream(videoRef.current);
      setStream(s);
    } catch (err) {
      if (err.name === 'NotAllowedError') toast.error('Camera blocked. Allow camera access and refresh.', { duration: 7000 });
      else if (err.name === 'NotFoundError') toast.error('No camera found.', { duration: 6000 });
      else if (err.name === 'NotReadableError') toast.error('Camera is in use by another app.');
      else toast.error('Camera error: ' + err.message);
    }
  };

  const stopCamera = () => { stopVideoStream(stream); setStream(null); };

  const startQRScanner = async () => {
    try {
      const { default: QrScanner } = await import('qr-scanner');
      const scanner = new QrScanner(qrVideoRef.current, res => {
        try {
          const data = JSON.parse(res.data);
          if (data.token && data.timetableId) {
            setQrToken(data.token);
            scanner.stop();
            toast.success('QR scanned successfully');
          }
        } catch { toast.error('Invalid QR code'); }
      }, { returnDetailedScanResult: true });
      await scanner.start();
      qrScannerRef.current = scanner;
    } catch { toast.error('Failed to start QR scanner'); }
  };

  const stopQRScanner = () => {
    if (qrScannerRef.current) { qrScannerRef.current.stop(); qrScannerRef.current.destroy(); qrScannerRef.current = null; }
    setQrToken('');
  };

  const handleFaceScan = async () => {
    if (!selected) return toast.error('Select a class first');
    setScanning(true);
    try {
      const canvas = captureFrame(videoRef.current, canvasRef.current);
      const selfieData = canvas.toDataURL('image/jpeg', 0.6);
      setSelfiePreview(selfieData);
      const descriptor = await getFaceDescriptor(canvas);
      if (!descriptor) { toast.error('No face detected. Look directly at the camera.'); setScanning(false); return; }
      if (!user.faceDescriptor || user.faceDescriptor.length === 0) { toast.error('Face not registered. Go to 🤳 Register Face first.'); setScanning(false); return; }
      const { match, distance, score } = compareFaces(user.faceDescriptor, descriptor);
      if (!match) { toast.error(`Face not recognized (distance: ${distance.toFixed(2)}). Try better lighting.`, { duration: 5000 }); setScanning(false); return; }
      await submitAttendance('face', score, descriptor, selfieData);
    } catch (err) {
      toast.error('Face scan failed: ' + err.message);
    } finally { setScanning(false); }
  };

  const handleOTPSubmit = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter 6-digit OTP');
    await submitAttendance('otp', 0, null, null);
  };

  const handleQRSubmit = async () => {
    if (!qrToken) return toast.error('Scan a QR code first');
    await submitAttendance('qr', 0, null, null);
  };

  const submitAttendance = async (methodType, score, liveDescriptor, selfieSnapshot) => {
    try {
      const { data } = await api.post('/attendance/mark', {
        timetableId: selected._id, method: methodType, faceMatchScore: score,
        liveDescriptor, location,
        otp: methodType === 'otp' ? otp : undefined,
        qrToken: methodType === 'qr' ? qrToken : undefined,
        selfieSnapshot,
      });
      setResult(data);
      stopCamera();
      stopQRScanner();
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
          {selfiePreview && <img src={selfiePreview} alt="Selfie" className={styles.selfieThumb} />}
          <button className={styles.btn} onClick={() => { setResult(null); setSelfiePreview(null); }}>Mark Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>📷 Mark Attendance</h2>
      <div className={styles.section}>
        <h3>Select Class</h3>
        {classes.length === 0 ? <div className={styles.empty}>No classes today</div> : (
          <div className={styles.classList}>
            {classes.map(cls => (
              <div key={cls._id} className={`${styles.classItem} ${selected?._id === cls._id ? styles.selectedClass : ''}`} onClick={() => setSelected(cls)}>
                <strong>{cls.subject}</strong>
                <span>{formatTime(cls.startTime)} – {formatTime(cls.endTime)}</span>
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
            {[['face','🤳 Face'], ['otp','🔑 OTP'], ['qr','📱 QR Code']].map(([m, label]) => (
              <button key={m} className={`${styles.methodTab} ${method === m ? styles.activeMethod : ''}`}
                onClick={() => { setMethod(m); stopCamera(); stopQRScanner(); }}>{label}</button>
            ))}
          </div>

          {method === 'face' && (
            <div className={styles.cameraSection}>
              <video ref={videoRef} autoPlay muted className={styles.video} style={{ display: stream ? 'block' : 'none' }} />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {!stream ? (
                <><button className={styles.btn} onClick={startCamera}>📷 Start Camera</button>
                <p className={styles.cameraHint}>Allow camera access when prompted.</p></>
              ) : (
                <div className={styles.btnRow}>
                  <button className={styles.btn} onClick={handleFaceScan} disabled={scanning}>{scanning ? 'Scanning...' : '✅ Scan Face'}</button>
                  <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={stopCamera}>Cancel</button>
                </div>
              )}
            </div>
          )}

          {method === 'otp' && (
            <div className={styles.otpSection}>
              <input className={styles.otpInput} placeholder="Enter 6-digit OTP" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} />
              <button className={styles.btn} onClick={handleOTPSubmit}>Submit OTP</button>
            </div>
          )}

          {method === 'qr' && (
            <div className={styles.qrSection}>
              {!qrToken ? (
                <><video ref={qrVideoRef} className={styles.qrVideo} />
                <div className={styles.btnRow}><button className={styles.btn} onClick={startQRScanner}>📱 Start QR Scanner</button></div>
                <p className={styles.cameraHint}>Point your camera at the QR code displayed by your teacher.</p></>
              ) : (
                <div className={styles.qrSuccess}>
                  <span>✅ QR Scanned</span>
                  <div className={styles.btnRow}>
                    <button className={styles.btn} onClick={handleQRSubmit}>Submit</button>
                    <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={stopQRScanner}>Rescan</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {location && <div className={styles.locationInfo}>📍 Location: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</div>}
        </div>
      )}
    </div>
  );
}
