export interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export interface Prescription {
  patientName: string;
  age: string;
  date: string;
  symptoms: string;
  advice: string;
  medicines: { name: string; dosage: string }[];
}
