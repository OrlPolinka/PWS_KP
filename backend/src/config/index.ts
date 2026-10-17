import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const paymentMode = process.env.PAYMENT_MODE || (nodeEnv === 'production' ? 'stripe' : 'mock');

if (paymentMode !== 'mock' && paymentMode !== 'stripe') {
  throw new Error('PAYMENT_MODE must be either "mock" or "stripe".');
}
if (nodeEnv === 'production' && paymentMode === 'mock') {
  throw new Error('PAYMENT_MODE=mock is not allowed in production.');
}

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv,
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'dance_studio',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  stripe: {
    mode: paymentMode,
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
};
