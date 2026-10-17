# Dance Studio Backend

Node.js/TypeScript backend for Dance Studio web application with PostgreSQL database.

## Features

- **Authentication**: JWT tokens + Google OAuth
- **Role-based access control**: Admin, Trainer, Client roles
- **User management**: CRUD operations for all user types
- **Schedule management**: Create and manage class schedules
- **Membership system**: Purchase memberships, request extensions
- **Booking system**: Book and cancel classes
- **Attendance tracking**: Mark client attendance
- **Chat system**: Direct messaging between users
- **News system**: Publish studio news
- **Notifications**: Real-time notifications for users
- **QR codes**: Unique QR codes for clients

## Architecture

The backend follows a clean layered architecture:

- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic layer
- **Repositories**: Database access layer
- **Middleware**: Authentication, authorization, validation, error handling
- **Routes**: API endpoint definitions

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dance_studio
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_key_change_this
JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

PAYMENT_MODE=mock
FRONTEND_URL=http://localhost:5173

PORT=3000
NODE_ENV=development
```

In development, payments use a local simulator by default. No Stripe account, API keys, or external payment request are needed. After clicking **Оплатить**, a card form opens. Enter `4242 4242 4242 4242` for a successful test payment or `4000 0000 0000 0002` to simulate a bank decline. The form also requires a future expiry date in `MM/YY` format, any three-digit CVC, and a postal code. Confirming the successful test card creates the membership and records a BYN payment; a declined card does not. This is only a local simulation and does not move money. Card details are checked in the browser and are not sent to or stored by the backend.

To use Stripe Checkout instead, set `PAYMENT_MODE=stripe` and configure test keys:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```
The client catalog and membership price remain in BYN. Stripe checkout converts the price to USD using the National Bank of the Republic of Belarus exchange rate, and includes the original BYN price and rate date in the product description. Memberships are activated only after Stripe sends a verified successful-payment webhook.

For local Stripe webhook testing, install the [Stripe CLI](https://docs.stripe.com/stripe-cli), then run:
```bash
stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
```
Copy the `whsec_...` value printed by Stripe CLI into `STRIPE_WEBHOOK_SECRET`. The CLI listener must stay running while testing. Use Stripe's test Visa card `4242 4242 4242 4242`, any future expiry date, and any CVC. Test keys and test cards do not move real money.

`PAYMENT_MODE` defaults to `mock` outside production and to `stripe` in production. The application refuses to start in production with `PAYMENT_MODE=mock`.

Clients can request a membership extension within 10 days after expiry. Unlimited memberships request extra days; visit-limited memberships request extra classes and receive a fresh validity period when approved. Administrators review requests at `/membership-extension-requests`; approving or rejecting a request sends the client a notification. Apply `20261017_membership_extension_requests.sql` before using this feature on an existing database.

3. Set up the database:
```bash
# Create database
createdb dance_studio

# Run the SQL script from the backend folder
psql -U postgres -d dance_studio -f ../database/db_DanceStudio.sql
```

For an existing installation, apply the migrations in this order:
```bash
psql -U postgres -d dance_studio -f ../database/migrations/20261010_weekly_schedule.sql
psql -U postgres -d dance_studio -f ../database/migrations/20261010_manage_dance_styles.sql
psql -U postgres -d dance_studio -f ../database/migrations/20261010_harden_news_notifications.sql
psql -U postgres -d dance_studio -f ../database/migrations/20261017_membership_prices_byn.sql
psql -U postgres -d dance_studio -f ../database/migrations/20261017_stripe_payment_currency.sql
psql -U postgres -d dance_studio -f ../database/migrations/20261017_membership_extension_requests.sql
```
The weekly migration preserves booked class dates while converting schedule entries to weekly slots (Monday = 1, Sunday = 7).

## Running the Application

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (clients only)
- `POST /api/auth/login` - Login with email/password (all roles)
- `GET /api/auth/google` - Google OAuth login (clients only)
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users` - Get all users (Admin only)
- `POST /api/users/create` - Create user by admin (Admin only - can create trainers and admins, not themselves)
- `GET /api/users/:id` - Get user by ID (authenticated)
- `PUT /api/users/:id` - Update user (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin can delete any user except themselves, Clients can delete only their own account)
- `PATCH /api/users/:id/deactivate` - Deactivate user (Admin only)
- `PATCH /api/users/:id/activate` - Activate user (Admin only)

### Trainers
- `GET /api/trainers` - List published trainers (Admin can list all)
- `GET /api/trainers/:id` - View a published trainer profile
- `POST /api/trainers` - Create trainer profile (Admin)
- `PUT /api/trainers/:id` - Update trainer profile (Admin)
- `DELETE /api/trainers/:id` - Permanently delete trainer, account, schedules, bookings and attendance (Admin)
- `GET /api/trainers/me/profile` - Get own profile (Trainer)
- `PATCH /api/trainers/me/profile` - Edit own profile (Trainer)
- `POST /api/trainers/me/media` - Upload up to 8 images/videos, 25 MB each (Trainer)

### Schedule
- `GET /api/schedule` - View weekly slots, ordered Monday to Sunday
- `GET /api/schedule/options` - Load halls and dance styles for the admin form
- `POST /api/schedule` - Add weekly slot (Admin)
- `PUT /api/schedule/:id` - Change weekly slot (Admin)
- `DELETE /api/schedule/:id` - Remove slot and cancel its bookings (Admin)
- `PATCH /api/schedule/:id/cancel` - Cancel slot (Admin)

### Membership Types
- `GET /api/membership-types` - Get all membership types
- `POST /api/membership-types` - Create membership type (Admin)
- `PUT /api/membership-types/:id` - Update membership type (Admin)
- `DELETE /api/membership-types/:id` - Archive membership type (Admin)
- `PATCH /api/membership-types/:id/active` - Restore archived type (Admin)
- Deletion archives a type so existing memberships retain their references.

### Dance Styles
- `GET /api/dance-styles` - Get active styles (Admin also sees archived styles)
- `POST /api/dance-styles` - Create style (Admin)
- `PUT /api/dance-styles/:id` - Update style (Admin)
- `DELETE /api/dance-styles/:id` - Permanently delete style, related schedules, bookings and attendance (Admin)

### Memberships
- `GET /api/memberships/my` - Get my memberships (Client)
- `POST /api/memberships/:membership_id/extension` - Request extension (Client)
- `GET /api/memberships/extension-requests` - Get extension requests (Admin)
- `PATCH /api/memberships/extension-requests/:id/approve` - Approve extension (Admin)
- `PATCH /api/memberships/extension-requests/:id/reject` - Reject extension (Admin)

### Bookings
- `GET /api/bookings/my` - Get my bookings (Client)
- `POST /api/bookings` - Create booking (Client)
- `PATCH /api/bookings/:id/cancel` - Cancel booking
- `PATCH /api/bookings/:id/check-in` - Check in client (Trainer)
- `GET /api/bookings/my/history` - Get visit history (Client)

### Attendance (Trainer)
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/my` - Get my attendance records

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/dialog/:other_user_id` - Get dialog
- `GET /api/messages/conversations` - Get conversations
- `PATCH /api/messages/:id/read` - Mark message as read

### News
- `GET /api/news` - Get published news (Admin can view drafts too)
- `POST /api/news` - Create news (Admin)
- `PUT /api/news/:id` - Update news (Admin)
- `DELETE /api/news/:id` - Delete news (Admin)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `GET /api/notifications/unread-count` - Get unread count

### Payments
- `POST /api/payments/checkout` - Create a Stripe Checkout session for an active membership type (Client)
- `GET /api/payments/:id` - Check the current user's Stripe payment status (Client)
- `POST /api/payments/stripe/webhook` - Receive Stripe payment notifications

## Role Permissions

### Admin
- Full access to all endpoints
- Manage users, trainers, schedule, membership types
- Approve/reject membership extensions
- Publish news
- Add, update and remove weekly class slots and trainers

### Trainer
- View schedule
- Mark attendance
- Check in clients
- Chat with clients and admin
- View their own attendance records
- Edit their own public profile and upload media

### Client
- View schedule
- Book/cancel classes
- Purchase memberships
- Request membership extensions
- View own memberships and visit history
- Chat with trainers and admin
- Read client recommendations
- Delete own profile
- Unique QR code (generated once at registration)

## Database Schema

The database schema is defined in `db_DanceStudio.sql` and includes:
- Users table with role-based access
- Trainers profile table
- Schedule, halls, dance styles
- Membership types and memberships
- Bookings and attendance
- Messages and notifications
- News

## Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- Role-based authorization middleware
- Rate limiting on API endpoints
- Helmet for security headers
- CORS enabled

## Development

The project uses:
- TypeScript for type safety
- Express.js for the web framework
- PostgreSQL with pg library
- Passport.js for Google OAuth
- Joi for validation (can be added to controllers)
- QRCode library for QR code generation

## License

ISC
