# Dance Studio

Full-stack web application for dance studio management.

## Project Structure

```
DanceStudio/
├── backend/          # Node.js/TypeScript backend API
├── database/         # PostgreSQL database schema
└── frontend/         # Frontend application (to be implemented)
```

## Backend

See [backend/README.md](backend/README.md) for detailed setup instructions.

## Database

See [database/README.md](database/README.md) for database setup instructions.

## Frontend

To be implemented.

## Features

### Authentication
- JWT token authentication
- Google OAuth 2.0
- Role-based access control (Admin, Trainer, Client)

### Admin Functions
- User management (create trainers and admins, not themselves)
- Trainer management
- Schedule management
- Membership types management
- Membership extension approvals
- News publishing

### Trainer Functions
- View schedule
- Mark attendance
- Check-in clients
- Chat with clients and admin
- View own attendance records

### Client Functions
- View schedule
- Book/cancel classes
- Purchase memberships
- Request membership extensions
- View own memberships and visit history
- Chat with trainers and admin
- Delete own profile
- Unique QR code (generated once at registration)

### Additional Features
- Chat system (all users can chat with each other)
- Notifications
- QR code generation (one per client)
