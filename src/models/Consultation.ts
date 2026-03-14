import mongoose, { Schema, Document } from 'mongoose';

export interface IConsultation extends Document {
  patient_name: string;
  age: string;
  symptoms: any[];
  diagnosis: string;
  severity: string;
  prescription: any[];
  advice: string;
  language: string;
  transcript: string;
  created_at: Date;
  call_status: string;
}

const ConsultationSchema: Schema = new Schema({
  patient_name: { type: String, default: '' },
  age: { type: String, default: '' },
  symptoms: { type: Array, default: [] },
  diagnosis: { type: String, default: '' },
  severity: { type: String, default: '' },
  prescription: { type: Array, default: [] },
  advice: { type: String, default: '' },
  language: { type: String, default: '' },
  transcript: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  call_status: { type: String, default: 'completed' }
});

export default mongoose.model<IConsultation>('Consultation', ConsultationSchema);
