import React, { useState, useEffect } from 'react';
import { VoiceDoctor } from './components/VoiceDoctor';
import { PrescriptionPanel } from './components/PrescriptionPanel';
import { Message, Prescription } from './types';
import { Heart, Shield, Activity, MessageSquare, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);

  const handleResponse = (transcript: string, aiResponse: string) => {
    // Clean AI response text for the log
    const cleanText = aiResponse
      .replace(/\[PRESCRIPTION_JSON:.*?\]/gs, '')
      .replace(/\[END_CALL\]/g, '')
      .trim();

    if (!transcript && !cleanText) return;
    
    setMessages(prev => [
      ...prev,
      { role: 'user', text: transcript || "(Audio input)" },
      { role: 'assistant', text: cleanText }
    ]);

    // Extract prescription JSON if present
    const jsonMatch = aiResponse.match(/\[PRESCRIPTION_JSON: (.*?)\]/s);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        setPrescription(parsed);
      } catch (e) {
        console.error('Failed to parse prescription JSON', e);
      }
    }
  };

  const toggleCall = () => {
    const nextState = !isCallActive;
    if (nextState === true) {
      // Starting a new call: Clear previous data
      setMessages([]);
      setPrescription(null);
    }
    setIsCallActive(nextState);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
              <Stethoscope className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Dr. Sanjay AI</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Telemedicine Active</span>
              </div>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Secure</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
              <Heart className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Primary Care</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Consultation */}
          <div className="lg:col-span-7 space-y-8">
            <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Activity className="text-emerald-600 w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">Voice Consultation</h2>
                </div>
                {isCallActive && (
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-widest border border-emerald-100">
                    Live Session
                  </div>
                )}
              </div>

              <VoiceDoctor 
                isCallActive={isCallActive} 
                onToggleCall={toggleCall} 
                onResponse={handleResponse} 
              />
            </section>

            {/* Conversation Log */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <MessageSquare className="text-slate-400 w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Conversation Log</h3>
              </div>
              
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm min-h-[200px] max-h-[400px] overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-300 italic text-sm py-12">
                    No conversation history yet...
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : 'bg-slate-100 text-slate-700 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Prescription */}
          <div className="lg:col-span-5">
            <div className="sticky top-32">
              <PrescriptionPanel prescription={prescription} />
              
              <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100">
                <h4 className="text-amber-800 font-bold text-sm mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Medical Disclaimer
                </h4>
                <p className="text-amber-700/80 text-xs leading-relaxed">
                  This AI doctor provides primary guidance based on symptoms. For emergencies or complex conditions, please visit a physical healthcare facility immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-50">
            <Stethoscope className="w-5 h-5" />
            <span className="text-sm font-bold tracking-tight">Dr. Sanjay AI</span>
          </div>
          <p className="text-slate-400 text-xs font-medium">
            © 2026 Telemedicine for Remote Regions. Powered by Gemini & Sarvam AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
