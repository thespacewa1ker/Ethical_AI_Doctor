import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment variables');
    return;
  }

  try {
    await mongoose.connect(uri, { dbName: 'Ethical_doctor' });
    console.log('MongoDB connected successfully to Ethical_doctor');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Do not exit process, allow server to run even if DB is down
  }
};
