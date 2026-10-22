'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Paperclip,
  Clock,
  ShieldCheck,
  FileText,
  User,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  Calendar,
} from 'lucide-react';

export default function ConsultationPage() {
  const params = useParams();
  const appointmentOrSessionId = params?.id as string;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Consultation Session State
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // WebRTC & Media State
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);

  // Chat State
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Document Sharing Modal State
  const [showDocModal, setShowDocModal] = useState(false);
  const [patientDocuments, setPatientDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  // Refs for WebRTC
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const lastSignalTimeRef = useRef<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 1. Initial Session Load
  const fetchSession = async () => {
    try {
      const res = await apiClient(`/api/consultations/session/${appointmentOrSessionId}`);
      if (res?.data) {
        setSession(res.data);
        if (res.data.windowStatus === 'BEFORE_WINDOW') {
          setCountdownSeconds(res.data.opensInSeconds || 60);
        } else {
          setCountdownSeconds(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load consultation session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (appointmentOrSessionId) {
      fetchSession();
    }
  }, [appointmentOrSessionId, user, authLoading]);

  // 2. Countdown Timer when BEFORE_WINDOW
  useEffect(() => {
    if (countdownSeconds === null || countdownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          fetchSession(); // Re-fetch once countdown reaches zero
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdownSeconds]);

  // 3. Auto-join room when WINDOW_OPEN
  useEffect(() => {
    if (session && session.windowStatus === 'WINDOW_OPEN') {
      apiClient(`/api/consultations/session/${session.id}/join`, { method: 'POST' }).catch((err) => {
        console.warn('Auto-join notification:', err.message);
      });
      initMediaAndWebRTC();
      loadMessages();
      loadPatientDocuments();
    }

    return () => {
      cleanupWebRTC();
    };
  }, [session?.id, session?.windowStatus]);

  // 4. WebRTC Initialization
  const initMediaAndWebRTC = async () => {
    if (peerConnectionRef.current) return;

    try {
      // 4a. Get user media
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (mediaErr: any) {
        console.warn('Camera/mic access denied, attempting audio only:', mediaErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (audioErr: any) {
          setCameraPermissionError('Camera and microphone access could not be acquired. You can still use real-time consultation chat.');
        }
      }

      if (stream) {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }

      // 4b. Setup RTCPeerConnection with Google STUN
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      if (stream) {
        stream.getTracks().forEach((track) => pc.addTrack(track, stream!));
      }

      // Listen for remote tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setPeerConnected(true);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && session?.id) {
          apiClient(`/api/consultations/session/${session.id}/signal`, {
            method: 'POST',
            body: JSON.stringify({ type: 'candidate', data: event.candidate }),
          }).catch(console.error);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setPeerConnected(true);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          setPeerConnected(false);
        }
      };

      // 4c. Doctor initiates offer if needed
      if (session?.currentUserRole === 'DOCTOR') {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await apiClient(`/api/consultations/session/${session.id}/signal`, {
          method: 'POST',
          body: JSON.stringify({ type: 'offer', data: offer }),
        });
      }
    } catch (err: any) {
      console.error('WebRTC initialization error:', err);
    }
  };

  // 5. Polling WebRTC Signals
  useEffect(() => {
    if (!session || session.windowStatus !== 'WINDOW_OPEN') return;

    const pollSignals = async () => {
      try {
        const query = lastSignalTimeRef.current ? `?since=${encodeURIComponent(lastSignalTimeRef.current)}` : '';
        const res = await apiClient(`/api/consultations/session/${session.id}/signals${query}`);
        const signals = res?.data || [];
        const pc = peerConnectionRef.current;

        for (const sig of signals) {
          lastSignalTimeRef.current = sig.createdAt;
          if (!pc) continue;

          const signalData = typeof sig.data === 'string' ? JSON.parse(sig.data) : sig.data;

          if (sig.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await apiClient(`/api/consultations/session/${session.id}/signal`, {
              method: 'POST',
              body: JSON.stringify({ type: 'answer', data: answer }),
            });
          } else if (sig.type === 'answer') {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(signalData));
            }
          } else if (sig.type === 'candidate') {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signalData));
            } catch (candErr) {
              console.warn('ICE candidate error:', candErr);
            }
          }
        }
      } catch (err) {
        // Soft error during polling
      }
    };

    const interval = setInterval(pollSignals, 2500);
    return () => clearInterval(interval);
  }, [session?.id, session?.windowStatus]);

  // 6. Polling Chat Messages
  const loadMessages = async () => {
    if (!session?.id) return;
    try {
      const res = await apiClient(`/api/consultations/session/${session.id}/messages`);
      if (res?.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.warn('Failed to load messages:', err);
    }
  };

  useEffect(() => {
    if (!session || session.windowStatus !== 'WINDOW_OPEN') return;
    const interval = setInterval(loadMessages, 2500);
    return () => clearInterval(interval);
  }, [session?.id, session?.windowStatus]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 7. Load Patient Documents for Sharing
  const loadPatientDocuments = async () => {
    if (!session?.id) return;
    try {
      setDocsLoading(true);
      const res = await apiClient(`/api/consultations/session/${session.id}/documents`);
      if (res?.data) {
        setPatientDocuments(res.data);
      }
    } catch (err) {
      console.warn('Failed to load patient records for sharing:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  // 8. Media Toggle Handlers
  const toggleMute = () => {
    if (!localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const cleanupWebRTC = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setPeerConnected(false);
  };

  const handleEndCall = async () => {
    if (!window.confirm('Are you sure you want to conclude this consultation?')) return;
    try {
      cleanupWebRTC();
      await apiClient(`/api/consultations/session/${session.id}/end`, { method: 'POST' });
      fetchSession();
    } catch (err: any) {
      alert(err.message || 'Failed to end consultation');
    }
  };

  // 9. Send Chat Message
  const handleSendMessage = async (e?: React.FormEvent, sharedDocId?: string) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !sharedDocId) return;

    setSendingMessage(true);
    try {
      const res = await apiClient(`/api/consultations/session/${session.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: newMessage.trim(),
          sharedDocumentId: sharedDocId || undefined,
        }),
      });

      if (res?.data) {
        setMessages((prev) => [...prev, res.data]);
        setNewMessage('');
        setShowDocModal(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Format countdown string
  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Render Loading
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
          <p className="text-sm font-semibold tracking-wide">Connecting to Secure LiveCare Room...</p>
        </div>
      </div>
    );
  }

  // Render Error
  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-white">Consultation Access Error</h2>
          <p className="text-sm text-slate-300">{error || 'Session could not be located.'}</p>
          <button
            onClick={() => router.back()}
            className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render Before Window Countdown Screen
  if (session.windowStatus === 'BEFORE_WINDOW') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
              Upcoming Consultation
            </span>
            <h1 className="text-xl font-bold text-white pt-2">Consultation Room Opens Shortly</h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              LiveCare rooms automatically unlock 15 minutes before the scheduled start time to ensure doctor and patient privacy.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-700/60 space-y-2">
            <div className="text-3xl font-mono font-black text-teal-400 tracking-wider">
              {countdownSeconds !== null ? formatCountdown(countdownSeconds) : '--:--'}
            </div>
            <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Time Remaining Until Open
            </p>
          </div>

          <div className="text-left text-xs text-slate-300 bg-slate-900/40 p-4 rounded-xl border border-slate-700/50 space-y-1.5">
            <div><strong>Doctor:</strong> Dr. {session.appointment?.slot?.doctor?.user?.firstName} {session.appointment?.slot?.doctor?.user?.lastName}</div>
            <div><strong>Patient:</strong> {session.appointment?.patient?.user?.firstName} {session.appointment?.patient?.user?.lastName}</div>
            <div><strong>Scheduled Start:</strong> {new Date(session.scheduledStartTime).toLocaleString()}</div>
            <div><strong>Booking Reference:</strong> <span className="font-mono text-teal-400">{session.appointment?.bookingReference}</span></div>
          </div>

          <button
            onClick={() => router.back()}
            className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render Expired or Cancelled Screen
  if (session.windowStatus === 'EXPIRED' || session.windowStatus === 'CANCELLED' || session.status === 'COMPLETED' || session.status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/50 text-slate-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-teal-400" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">
              {session.status === 'CANCELLED' ? 'Consultation Cancelled' : 'Consultation Concluded'}
            </h2>
            <p className="text-xs text-slate-400">
              {session.status === 'CANCELLED'
                ? 'This appointment was cancelled. LiveCare video and chat access have been deactivated.'
                : 'This clinical consultation session has officially concluded.'}
            </p>
          </div>

          <div className="text-left text-xs text-slate-300 bg-slate-900/40 p-4 rounded-xl border border-slate-700 space-y-1">
            <div><strong>Reference:</strong> <span className="font-mono text-teal-400">{session.appointment?.bookingReference}</span></div>
            <div><strong>Status:</strong> {session.status}</div>
          </div>

          <button
            onClick={() => router.back()}
            className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 10. ACTIVE CONSULTATION ROOM (Video + Chat)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="h-14 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Leave room"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-xs md:text-sm font-bold text-white tracking-wide">
                LiveCare Consultation • Dr. {session.appointment?.slot?.doctor?.user?.firstName} {session.appointment?.slot?.doctor?.user?.lastName} & {session.appointment?.patient?.user?.firstName} {session.appointment?.patient?.user?.lastName}
              </h1>
            </div>
            <p className="text-[10px] text-slate-400">
              Ref: <span className="font-mono text-teal-400">{session.appointment?.bookingReference}</span> • Room: {session.roomName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>End-to-End Authorized</span>
          </span>
          <button
            onClick={handleEndCall}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>End Consultation</span>
          </button>
        </div>
      </header>

      {/* Main Split Layout: Video Screen on Left, Chat on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT: Video Consultation Panel */}
        <section className="flex-1 flex flex-col bg-slate-950 p-3 sm:p-4 gap-3 relative overflow-hidden">
          {cameraPermissionError && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cameraPermissionError}</span>
            </div>
          )}

          {/* Video Grid Container */}
          <div className="flex-1 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center justify-center min-h-[300px]">
            {/* Remote Peer Video (Large) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover rounded-2xl ${peerConnected ? 'block' : 'hidden'}`}
            />

            {/* Waiting for Peer Screen */}
            {!peerConnected && (
              <div className="text-center p-6 space-y-3 z-10">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-teal-400">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {session.currentUserRole === 'DOCTOR' ? 'Waiting for patient to join...' : 'Waiting for doctor to connect...'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto pt-1">
                    Your WebRTC consultation room is active. Audio & video will automatically connect once the other participant arrives.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs">
                  <RefreshCw className="w-3 h-3 text-teal-400 animate-spin" />
                  <span>Signaling via Google STUN Server</span>
                </div>
              </div>
            )}

            {/* Local User Picture-in-Picture Video */}
            <div className="absolute bottom-4 right-4 w-36 h-28 sm:w-48 sm:h-36 rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-700 shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-xs font-semibold">
                  Camera Off
                </div>
              )}
              <div className="absolute bottom-1 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono">
                You ({session.currentUserRole})
              </div>
            </div>
          </div>

          {/* Media Control Toolbar */}
          <div className="h-14 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-center gap-3 px-4 shrink-0 shadow-lg">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition ${
                isMuted ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition ${
                isVideoOff ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setShowDocModal(true)}
              className="px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition border border-teal-500/20"
              title="Share verified medical reports in consultation"
            >
              <Paperclip className="w-4 h-4 text-teal-400" />
              <span>Share Medical Report</span>
            </button>

            <button
              onClick={handleEndCall}
              className="p-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm ml-2"
              title="End consultation call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* RIGHT: Real-time 1-on-1 Consultation Chat Panel */}
        <section className="w-full lg:w-96 flex flex-col bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 shrink-0 h-[400px] lg:h-auto">
          {/* Chat Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              <h2 className="text-xs font-bold text-white tracking-wide uppercase">Consultation Chat</h2>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {messages.length} messages
            </span>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950/40">
            {messages.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-xs space-y-1">
                <FileText className="w-6 h-6 mx-auto opacity-40" />
                <p>No messages yet.</p>
                <p className="text-[11px] text-slate-600">Send notes or share diagnostic reports directly with your provider.</p>
              </div>
            )}

            {messages.map((m) => {
              const isMe = m.senderId === user?.id;
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pb-0.5">
                    <span className="font-semibold text-slate-300">{m.senderName}</span>
                    <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] ${m.senderRole === 'DOCTOR' ? 'bg-teal-500/20 text-teal-300' : 'bg-brand-500/20 text-brand-300'}`}>
                      {m.senderRole}
                    </span>
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs ${
                      isMe
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>

                    {/* Shared Document Attachment Card */}
                    {m.sharedDocument && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-200 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-teal-300">
                          <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span className="truncate">{m.sharedDocument.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {m.sharedDocument.category} • {(m.sharedDocument.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDocModal(true)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Attach clinical document"
            >
              <Paperclip className="w-4 h-4 text-teal-400" />
            </button>
            <input
              type="text"
              placeholder="Type consultation message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="submit"
              disabled={sendingMessage || !newMessage.trim()}
              className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>

      {/* MODAL: Share Medical Record */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Share Medical Record</h3>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select a verified diagnostic report or prescription belonging to this patient to share directly in the consultation chat room.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {docsLoading && (
                <div className="text-center py-6 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                  <span>Loading records...</span>
                </div>
              )}

              {patientDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-teal-500/50 flex items-center justify-between gap-3 transition"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{doc.title}</p>
                    <p className="text-[10px] text-slate-400">{doc.category} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleSendMessage(undefined, doc.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shrink-0 transition"
                  >
                    Share
                  </button>
                </div>
              ))}

              {!docsLoading && patientDocuments.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No verified records found for this patient yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDocModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
