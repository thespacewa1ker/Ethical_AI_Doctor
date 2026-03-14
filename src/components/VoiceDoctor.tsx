import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Volume2, Loader2, PhoneOff, PhoneCall, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

interface VoiceDoctorProps {
  onResponse: (transcript: string, aiResponse: string) => void;
  isCallActive: boolean;
  onToggleCall: () => void;
}

export const VoiceDoctor: React.FC<VoiceDoctorProps> = ({ onResponse, isCallActive, onToggleCall }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptRef = useRef("");
  const aiResponseRef = useRef("");
  const fullTranscriptRef = useRef("");

  const SYSTEM_PROMPT = `You are Dr. Sanjay, an AI telemedicine doctor providing primary healthcare consultation for people living in remote and hilly regions.

Supported languages: English, Hindi, Kannada, Telugu, Bengali.

BEHAVIOR:
1. START THE CONVERSATION: You must speak first as soon as the call starts. Greet the patient warmly and ask how they are feeling today.
2. INVESTIGATIVE APPROACH: Act like a real doctor conducting a thorough investigation.
3. ONE QUESTION AT A TIME: Ask exactly one detailed follow-up question at a time. Do not overwhelm the patient.
4. STEP-BY-STEP DIAGNOSIS: Gradually gather information about symptoms, duration, and severity.
5. CALM & PROFESSIONAL: Speak like a calm, empathetic primary healthcare doctor. Use short, clear sentences.

CONSULTATION FLOW:
- Greet and ask for the primary concern.
- Investigate symptoms step-by-step (onset, duration, associated symptoms).
- Ask for patient details (name, age) during the flow when appropriate.
- Classify illness severity: MILD, MODERATE, SEVERE.

If illness is MILD:
- Generate prescription using generic medicines (PMBJP).
- Provide home care advice.

If illness is MODERATE or SEVERE:
- Say: 'Your symptoms may require medical attention. Please consult a doctor or visit the nearest hospital.' Then end the conversation with [END_CALL].

When you decide to give a prescription or conclude a consultation, please end your response with a JSON block like this:
[CONSULTATION_JSON: {
  "patient_name": "...",
  "age": "...",
  "symptoms": ["list of symptoms"],
  "diagnosis": "...",
  "severity": "...",
  "prescription": ["list of medicines with dosage"],
  "advice": "...",
  "language": "...",
  "call_status": "completed"
}] followed by [END_CALL].

If the patient has no more questions and the consultation is complete, say goodbye and end with [END_CALL].`;

  const shouldEndCallRef = useRef(false);

  const startLiveSession = async () => {
    setIsConnecting(true);
    shouldEndCallRef.current = false;
    fullAiResponseRef.current = "";
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Context
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: SYSTEM_PROMPT,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            onToggleCall();
            startMic();
          },
          onmessage: async (message: any) => {
            // Handle Audio Output
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData) {
                  const base64Audio = part.inlineData.data;
                  const binaryString = atob(base64Audio);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const pcmData = new Int16Array(bytes.buffer);
                  audioQueueRef.current.push(pcmData);
                  if (!isPlayingRef.current) {
                    playNextInQueue();
                  }
                }
                if (part.text) {
                  aiResponseRef.current += part.text;
                  fullAiResponseRef.current += part.text;
                }
              }
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              setIsSpeaking(false);
            }

            // When a turn is complete, update the parent
            if (message.serverContent?.turnComplete) {
              if (transcriptRef.current || aiResponseRef.current) {
                onResponse(transcriptRef.current, aiResponseRef.current);
                fullTranscriptRef.current += "Doctor: " + aiResponseRef.current + "\n";
                
                if (aiResponseRef.current.includes("[END_CALL]")) {
                  console.log('AI requested end of call');
                  setTimeout(() => {
                    endCall();
                  }, 3000); // Wait for final audio to finish
                }
                
                transcriptRef.current = "";
                aiResponseRef.current = "";
              }
              setIsSpeaking(false);
            }
            
            // Track user transcript
            const userText = message.serverContent?.userContent?.parts?.[0]?.text;
            if (userText) {
              transcriptRef.current += userText;
              fullTranscriptRef.current += "Patient: " + userText + "\n";
            }
          },
          onclose: () => {
            stopMic();
            onToggleCall();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            stopMic();
          }
        }
      });

      sessionPromise.then(s => {
        sessionRef.current = s;
      });

      await sessionPromise;
    } catch (err) {
      console.error("Failed to start live session:", err);
      setIsConnecting(false);
    }
  };

  const saveConsultation = async (data: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          transcript: fullTranscriptRef.current,
          created_at: new Date().toISOString()
        })
      });
      if (response.ok) {
        console.log('Consultation saved successfully');
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save consultation:', response.status, errorData);
        return false;
      }
    } catch (err: any) {
      console.error('Network error saving consultation:', err);
      if (err.message?.includes('Failed to fetch')) {
        console.warn('Possible server restart or network issue.');
      }
      return false;
    }
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const source = audioContextRef.current!.createMediaStreamSource(stream);
      const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current) return;

        try {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          sessionRef.current.sendRealtimeInput({
            media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
          }).catch(err => {
            // Silently handle send errors if session is closing
            if (!err.message?.includes('closed')) {
              console.error('Error sending audio:', err);
            }
          });
          setIsListening(true);
        } catch (err) {
          // Handle potential issues during processing
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current!.destination);
    } catch (err) {
      console.error("Error starting mic:", err);
    }
  };

  const stopMic = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    setIsListening(false);
  };

  const playNextInQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      if (shouldEndCallRef.current) {
        // AI has finished speaking the final response, now end the call
        setTimeout(() => {
          endCall();
          shouldEndCallRef.current = false;
        }, 1000);
      }
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const pcmData = audioQueueRef.current.shift()!;
    
    const sampleRate = 24000;
    const audioBuffer = audioContextRef.current!.createBuffer(1, pcmData.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 0x7FFF;
    }

    const source = audioContextRef.current!.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current!.destination);
    source.onended = () => playNextInQueue();
    source.start();
  };

  const fullAiResponseRef = useRef("");

  const endCall = async () => {
    console.log('Ending call and saving conversation...');
    
    // 1. Extract any structured data from the accumulated AI responses if possible
    let structuredData: any = {};
    const jsonMatch = fullAiResponseRef.current.match(/\[CONSULTATION_JSON: (.*?)\]/s);
    if (jsonMatch && jsonMatch[1]) {
      try {
        // Try to find the last complete JSON if multiple exist or if it's long
        const potentialJson = jsonMatch[1].trim();
        const lastBrace = potentialJson.lastIndexOf('}');
        if (lastBrace !== -1) {
          structuredData = JSON.parse(potentialJson.substring(0, lastBrace + 1));
        }
      } catch (e) {
        console.error('Failed to parse structured data at end of call', e);
      }
    }

    // 2. Save the whole conversation to the DB
    console.log(`Saving transcript of length: ${fullTranscriptRef.current.length}`);
    const saveSuccess = await saveConsultation({
      ...structuredData,
      transcript: fullTranscriptRef.current,
      call_status: 'completed'
    });

    if (saveSuccess) {
      console.log('Conversation saved successfully, closing session.');
    } else {
      console.warn('Failed to save conversation, but closing session anyway.');
    }

    // 3. Clean up and close
    stopMic();
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        // Ignore close errors
      }
      sessionRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    onToggleCall();
  };

  useEffect(() => {
    return () => {
      stopMic();
      if (sessionRef.current) sessionRef.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-12">
      <div className="relative">
        <motion.div
          animate={isSpeaking ? { scale: [1, 1.1, 1], rotate: [0, 2, -2, 0] } : isListening ? { scale: [1, 1.05, 1] } : { scale: 1 }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className={`w-48 h-48 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
            !isCallActive ? 'bg-slate-100' : isSpeaking ? 'bg-emerald-500 shadow-emerald-200' : 'bg-blue-500 shadow-blue-200'
          }`}
        >
          {isConnecting ? (
            <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
          ) : !isCallActive ? (
            <PhoneCall className="w-16 h-16 text-slate-400" />
          ) : isSpeaking ? (
            <Volume2 className="w-16 h-16 text-white" />
          ) : (
            <Radio className="w-16 h-16 text-white animate-pulse" />
          )}
        </motion.div>
        
        {isCallActive && (
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full shadow-md border border-slate-100 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
              {isSpeaking ? 'Dr. Sanjay Speaking' : 'Listening...'}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {!isCallActive ? (
          <button
            onClick={startLiveSession}
            disabled={isConnecting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50"
          >
            {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <PhoneCall className="w-5 h-5" />}
            Start Live Consultation
          </button>
        ) : (
          <button
            onClick={endCall}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 border border-red-100"
          >
            <PhoneOff className="w-5 h-5" />
            End Consultation
          </button>
        )}
      </div>

      <p className="text-slate-400 text-sm font-medium max-w-xs text-center">
        {!isCallActive 
          ? "Connect for a real-time, hands-free conversation with Dr. Sanjay." 
          : "The consultation is live. You can speak naturally at any time."}
      </p>
    </div>
  );
};
