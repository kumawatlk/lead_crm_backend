import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from './src/routes/auth.routes.js';
import leadRoutes from './src/routes/leads.routes.js';
import freshLeadsRoutes from './src/routes/fresh-leads.routes.js';
import { ensureDemoData } from './src/seed/demo.seed.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

/* =========================
   ✅ CORS FIX (IMPORTANT)
========================= */

const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:5173', // (Vite default - optional)
  'https://lead-crm-frontend-nine.vercel.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Blocked by CORS:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// ✅ Handle preflight requests (CRITICAL FIX)
app.options('*', cors());

/* ========================= */

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes(JWT_SECRET));
app.use('/api/leads', leadRoutes(JWT_SECRET));
app.use('/api/fresh-leads', freshLeadsRoutes(JWT_SECRET));

async function start() {
  try {
    await mongoose.connect(MONGODB_URI);

    await ensureDemoData();

    app.listen(PORT, () => {
      console.log(`✅ Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();