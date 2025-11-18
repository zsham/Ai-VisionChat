
import React, { useState, useRef, useCallback } from 'react';
import { BackIcon, CameraIcon } from './Icons';

interface CameraCaptureProps {
  onCapture: (imageData: { base64: string, mimeType: string }) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access the camera. Please ensure permissions are granted.");
      setStream(null);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64 = dataUrl.split(',')[1];
        onCapture({ base64, mimeType: 'image/jpeg' });
        stopCamera();
        onClose();
      }
    }
  }, [onCapture, stopCamera, onClose]);

  return (
    <div className="absolute inset-0 bg-gray-900 z-20 flex flex-col p-4 text-white">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
          <BackIcon className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold">Capture Photo</h2>
        <div className="w-8"></div>
      </div>

      <div className="flex-grow flex items-center justify-center bg-black rounded-lg overflow-hidden relative">
        {!stream && (
          <div className="text-center">
            <p className="mb-4">Tap below to start your camera</p>
            <button
              onClick={startCamera}
              className="px-6 py-3 bg-indigo-600 rounded-lg font-semibold hover:bg-indigo-500 transition-colors"
            >
              Start Camera
            </button>
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-contain ${!stream ? 'hidden' : ''}`}
        ></video>
        {error && <p className="absolute bottom-4 text-center text-red-400 p-2 bg-red-900/50 rounded">{error}</p>}
      </div>

      {stream && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={capturePhoto}
            className="p-4 bg-white rounded-full text-gray-900 hover:bg-gray-200 transition-transform transform hover:scale-105"
            aria-label="Capture Photo"
          >
            <CameraIcon className="w-8 h-8" />
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden"></canvas>
    </div>
  );
};

export default CameraCapture;
