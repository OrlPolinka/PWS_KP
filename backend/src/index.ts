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

const app: Application = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Превышен лимит запросов. Подождите 15 минут и попробуйте снова.' },
});

app.use(helmet());
app.use(cors());
app.use('/api/', limiter);
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
});

export default app;
