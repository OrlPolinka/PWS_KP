import 'express-async-errors';
import express, { Application } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from './config/passport';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';
import { PaymentController } from './controllers';
import { BookingService } from './services';

const app: Application = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Превышен лимит запросов. Подождите 15 минут и попробуйте снова.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа или регистрации. Подождите 15 минут и попробуйте снова.' },
});

app.use(helmet());
app.use(cors());
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);
app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), PaymentController.handleWebhook);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(__dirname, '../uploads')));

app.use(passport.initialize());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(errorHandler);

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);

  const markPastBookings = async () => {
    try {
      const updatedCount = await BookingService.markPastBookingsAsNoShow();
      if (updatedCount > 0) {
        console.log(`Automatically marked ${updatedCount} past booking(s) as no-show`);
      }
    } catch (error) {
      console.error('Failed to mark past bookings as no-show:', error);
    }
  };

  void markPastBookings();
  setInterval(() => void markPastBookings(), 60_000);
});

export default app;
