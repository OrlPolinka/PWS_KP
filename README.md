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

## Run locally with Docker and HTTPS

The frontend's Nginx container serves the previous local address
`http://localhost:5173` and HTTPS at `https://localhost`. No separate HTTPS
container is needed. A trusted local certificate is created once with mkcert.

The existing `backend/.env` supplies your credentials. The Google OAuth callback
stays on `localhost`, as in the local setup:

```env
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

In Google Cloud Console, keep
`http://localhost:3000/api/auth/google/callback` as an authorized redirect URI.
After Google sign-in, the app opens at `https://localhost`. No domain or
production OAuth setup is needed.

Install mkcert once:

```powershell
winget install --id FiloSottile.mkcert --exact
```

Open a new PowerShell window after installation. From the repository root,
create and trust the local certificate:

```powershell
.\scripts\setup-https.ps1
```

This installs mkcert's local root CA in the Windows trusted certificate store
and creates the `localhost` certificate used by Nginx. If Windows reports a
permissions error, run PowerShell as Administrator and repeat the command.
Restart Chrome or Edge after installation. The certificate and server key stay
in the ignored `frontend\certs` folder; do not share them. Never share the
mkcert root CA private key either.

If `backend/.env` does not exist yet, create it from the example:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

Stop any locally running frontend/backend first, so ports 5173 and 3000 are free.

From the repository root, build the three images and start their containers:

```powershell
docker compose up --build -d
```

Open `https://localhost` to use the app through HTTPS, or
`http://localhost:5173` to use the original local address.

Check the three containers and view their logs:

```powershell
docker compose ps
docker compose logs -f
```

Stop them with:

```powershell
docker compose down
```

PostgreSQL needs a password internally to accept connections. For this
local-only Docker setup, Compose supplies `dance_studio_local` automatically;
you do not need to type or configure it. This is separate from your Google,
JWT, or application account credentials. If you choose to pass
`--env-file .\backend\.env`, Compose uses the database values from that file
for both the PostgreSQL and backend containers.

PostgreSQL initializes from `database/db_DanceStudio.sql` on the first run.
Database data is kept in a Docker volume; uploaded files stay in
`backend/uploads`. Profile photos, trainer gallery media, and news images are
selected from the computer and served by the backend; the upload folder is
shared with the host so those files remain available across container rebuilds.
Previously saved external media links are not downloaded automatically; upload
the original files from the computer to store them locally.
The existing database installed on your computer is not copied into Docker
automatically, so the Docker database starts empty.
Do not use `down -v` unless you intend to delete the Docker database.

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
