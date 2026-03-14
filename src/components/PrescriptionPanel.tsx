import React from 'react';
import { Prescription } from '../types';
import { FileText, Calendar, User, Activity, Pill, Info } from 'lucide-react';

interface PrescriptionPanelProps {
  prescription: Prescription | null;
}

export const PrescriptionPanel: React.FC<PrescriptionPanelProps> = ({ prescription }) => {
  if (!prescription) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[400px]">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <FileText className="text-slate-300 w-8 h-8" />
        </div>
        <h3 className="text-slate-900 font-medium mb-2">No Prescription Yet</h3>
        <p className="text-slate-500 text-sm max-w-[200px]">
          Complete your consultation with Dr. Sanjay to receive a prescription.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden h-full">
      <div className="bg-emerald-600 p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Medical Prescription</h2>
            <p className="text-emerald-100 text-sm opacity-90">Pradhan Mantri Bhartiya Janaushadhi Pariyojana</p>
          </div>
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4 pb-6 border-bottom border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Patient</p>
              <p className="text-sm font-medium text-slate-900">{prescription.patientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center">
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Date</p>
              <p className="text-sm font-medium text-slate-900">{prescription.date}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Symptoms</h3>
            </div>
            <p className="text-slate-700 text-sm leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {prescription.symptoms}
            </p>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Pill className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Medicines (Jan Aushadhi)</h3>
            </div>
            <div className="space-y-2">
              {prescription.medicines.map((med, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                  <span className="text-sm font-medium text-slate-900">{med.name}</span>
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-100 px-2 py-1 rounded-md">{med.dosage}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Advice & Monitoring</h3>
            </div>
            <div className="text-slate-700 text-sm space-y-2">
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                {prescription.advice}
              </p>
              <p className="text-[10px] text-slate-400 font-medium leading-tight px-1">
                * If symptoms worsen or persist more than 3 days, consult a doctor immediately.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
