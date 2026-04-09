import React, { useRef, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { loadModels, getFaceDescriptor, startVideoStream, stopVideoStream, captureFrame } from '../../services/faceService';
import toast from 'react-hot-toast';
import styles from './RegisterFace.module.css';

export default function RegisterFace() {
  const { user, updateUser } = useAuth();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [captured, setCaptured] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      await loadModels();
      const s = await startVideoStream(videoRef.current);
      setStream(s);
    } catch (err) {
      toast.error('Camera error: ' + err.message);
    }
  };

  const stopCamera = () => {
    stopVideoStream(stream);
    setStream(null);
    setCaptured(false);
  };

  const handleCapture = async () => {
    setLoading(true);
    try {
      const canvas = captureFrame(videoRef.current, canvasRef.current);
      const descriptor = await getFaceDescriptor(canvas);

      if (!descriptor) {
        toast.error('No face detected. Look directly at the camera in good lighting.');
        setLoading(false);
        return;
      }

      await api.put(`/students/${user._id}/face-descriptor`, { faceDescriptor: descriptor });
      updateUser({ faceDescriptor: descriptor });
      setCaptured(true);
      stopCamera();
      toast.success('Face registered successfully! You can now use face recognition for attendance.');
    } catch (err) {
      toast.error('Failed to register face: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const alreadyRegistered = user?.faceDescriptor?.length > 0;

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>🤳 Face Registration</h2>

      <div className={styles.card}>
        <div className={styles.status}>
          {alreadyRegistered && !captured ? (
            <div className={styles.registered}>✅ Face already registered — you can re-register to update it</div>
          ) : captured ? (
            <div className={styles.registered}>✅ Face registered successfully!</div>
          ) : (
            <div className={styles.notRegistered}>⚠️ No face registered yet — register to use face attendance</div>
          )}
        </div>

        <div className={styles.instructions}>
          <p>Tips for best results:</p>
          <ul>
            <li>Sit in a well-lit area facing the light</li>
            <li>Look directly at the camera</li>
            <li>Remove glasses if possible</li>
            <li>Keep a neutral expression</li>
          </ul>
        </div>

        <video ref={videoRef} autoPlay muted className={styles.video}
          style={{ display: stream ? 'block' : 'none' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!stream ? (
          <button className={styles.btn} onClick={startCamera}>📷 Start Camera</button>
        ) : (
          <div className={styles.btnRow}>
            <button className={styles.btn} onClick={handleCapture} disabled={loading}>
              {loading ? 'Processing...' : '✅ Capture & Register Face'}
            </button>
            <button className={`${styles.btn} ${styles.btnCancel}`} onClick={stopCamera}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
