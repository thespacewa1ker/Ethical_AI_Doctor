import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import { connectDB } from './src/db';
import mongoose from 'mongoose';
import Consultation from './src/models/Consultation';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ override: true });

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize DB in background
  connectDB().catch(err => console.error('Background DB connection error:', err));

  app.use(express.json());

  // AI Services Setup
  const getAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is missing');
    console.log(`Using Gemini API Key (length: ${key.length}, starts with: ${key.substring(0, 4)})`);
    return new GoogleGenAI({ apiKey: key });
  };
  
  const SYSTEM_PROMPT = `You are Dr. Sanjay, an AI telemedicine doctor providing primary healthcare consultation for people living in remote and hilly regions.

Supported languages: English, Hindi, Kannada, Telugu, Bengali.

BEHAVIOR:
1. INVESTIGATIVE APPROACH: Act like a real doctor conducting a thorough investigation.
2. ONE QUESTION AT A TIME: Ask exactly one detailed follow-up question at a time. Do not overwhelm the patient.
3. STEP-BY-STEP DIAGNOSIS: Gradually gather information about symptoms, duration, and severity.
4. CALM & PROFESSIONAL: Speak like a calm, empathetic primary healthcare doctor. Use short, clear sentences.

CONSULTATION FLOW:
- Greet and ask for the primary concern.
- Investigate symptoms step-by-step (onset, duration, associated symptoms).
- Ask for patient details (name, age) during the flow when appropriate.
- Classify illness severity: MILD, MODERATE, SEVERE.

If illness is MILD:
- Generate prescription using generic medicines (PMBJP).
- Provide home care advice.

If illness is MODERATE or SEVERE:
- Say: 'Your symptoms may require medical attention. Please consult a doctor or visit the nearest hospital.'`;

  // API Routes
  app.post('/api/consultations', async (req, res) => {
    try {
      const data = req.body;
      console.log('Received consultation data:', JSON.stringify(data).substring(0, 200) + '...');
      
      if (mongoose.connection.readyState !== 1) {
        console.warn('MongoDB not connected. Current state:', mongoose.connection.readyState);
      }

      const consultation = new Consultation({
        patient_name: data.patient_name,
        age: data.age,
        symptoms: Array.isArray(data.symptoms) ? data.symptoms : (data.symptoms ? [data.symptoms] : []),
        diagnosis: data.diagnosis,
        severity: data.severity,
        prescription: Array.isArray(data.prescription) ? data.prescription : (data.prescription ? [data.prescription] : []),
        advice: data.advice,
        language: data.language,
        transcript: data.transcript || '',
        created_at: data.created_at || new Date(),
        call_status: data.call_status || 'completed'
      });
      await consultation.save();
      console.log('Consultation saved to MongoDB');
      res.json({ success: true, id: consultation._id });
    } catch (error: any) {
      console.error('Error saving consultation:', error);
      res.status(500).json({ error: 'Failed to save consultation', details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });
}

startServer();
