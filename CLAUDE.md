# WKM RMS — Teltonika RMS API Integration Platform

This document specifies the technical architecture, database schemas, and API endpoints for a custom in-house platform built to interface with the Teltonika Remote Management System (RMS) API.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database ORM:** Prisma
- **Database Engine:** PostgreSQL (can be configured to MySQL or SQLite if needed)
- **Authentication:** NextAuth.js or custom session verification
- **Styling:** Vanilla CSS (no Tailwind)
- **Import Alias:** `@/*`

## Deployment / Target Environment

- **Development (Local):** Windows 11 with Docker Desktop running the PostgreSQL database.
- **Production:** Ubuntu Linux server with Docker Compose compiling Next.js into a standalone Node.js server behind an Nginx reverse proxy.

## Architecture & Security Guidelines

- **Token Security:** Do **not** expose the Teltonika Personal Access Token (PAT) to the client browser. All communication with Teltonika's API must be proxied through the secure Next.js backend (`app/api/*` routes) using the environment variable `TELTONIKA_RMS_API_TOKEN`.
- **State & Caching:** Because Teltonika enforces API rate limits (typically 100,000 free requests per month per developer account), the local application must cache read queries. Avoid querying the Teltonika API directly on every page load; query the database or use background polling combined with a cache (like Redis) for dashboard widgets.
- **Component Split:** Use React Server Components (RSC) for initial page renders and layouts, and Client Components only for elements requiring real-time page updates or CLI terminal emulation.

---

## Database Schema (Prisma)

Copy the following schema into your `prisma/schema.prisma` file:

```prisma
datasource db {
  provider = "postgresql" // Or "mysql" / "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-generator"
}

enum SystemRole {
  SUPERADMIN
  MANAGER
  OPERATOR
  VIEWER
}

model User {
  id            String            @id @default(uuid())
  email         String            @unique
  passwordHash  String
  name          String
  role          SystemRole        @default(VIEWER)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  // Auditing: Tracking who executed specific commands on Teltonika
  actionLogs    DeviceActionLog[]
}

model Device {
  id            String            @id // Matches the Teltonika RMS 'device_id' string
  name          String            // Custom alias given by your system
  macAddress    String?           @unique
  serialNumber  String?           @unique
  isActive      Boolean           @default(true)
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  // Relations
  actionLogs    DeviceActionLog[]
}

model DeviceActionLog {
  id           String   @id @default(uuid())
  deviceId     String
  userId       String
  actionType   String   // e.g., "REBOOT", "CONFIG_WRITE", "COMMAND_EXECUTE"
  scopeUsed    String   // Stores the specific scope used (e.g., "command:execute")
  payload      Json?    // Optional parameters sent with the command
  status       String   // "PENDING", "SUCCESS", "FAILED"
  errorMessage String?
  executedAt   DateTime @default(now())

  // Relationships
  device       Device   @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  user         User     @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([deviceId])
  @@index([userId])
}
```

---

## Target Endpoints & Scopes (Mapped to local user roles)

To maintain security, the API scopes obtained from the Teltonika PAT are mapped internally to local system roles. Local route guards check user roles before forwarding requests to Teltonika RMS.

### 1. Read Operations (`VIEWER` & Above)

Granted access to read status, logs, configurations, and location information.

- `devices:read`
- `device_logs:read`
- `device_location:read`
- `dynamic_dns:read`
- `device_actions:read`
- `device_configurations:read`
- `wireless:read`
- `device_alert_configurations:read`

### 2. Operator Actions (`OPERATOR` & Above)

Granted access to perform actions on devices, send CLI commands, and setup remote tunnels.

- `device_actions:write` (Reboot, update firmware)
- `command:execute` (CLI passthrough terminal)
- `device_remote_access:write` (RMS Connect HTTP/SSH links)
- `device_tasks:write` / `device_tasks:execute`
- `device_hotspots:write`
- `device_configurations:write`

### 3. Management Actions (`MANAGER` / `SUPERADMIN`)

Granted destructive and administrative access over organizational details, users, and billing credits.

- `devices:write` / `devices:move` / `devices:delete`
- `users:write` / `users:read` / `users:delete`
- `companies:write` / `companies:read` / `companies:delete`
- `credits:write` / `credit_transfer_codes:write`

---

## Next.js API Route Handler Pattern

When building route handlers (e.g., `app/api/devices/[id]/execute/route.ts`), use the following implementation pattern to verify credentials locally, audit actions, and communicate with the Teltonika RMS API:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // 1. Mock session check (e.g., NextAuth)
  const currentUserId = "user-uuid-here";
  const user = await prisma.user.findUnique({
    where: { id: currentUserId }
  });

  // 2. Local Guard: Only OPERATOR or higher can execute commands
  if (!user || (user.role !== 'OPERATOR' && user.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
  }

  const { commandString } = await req.json();

  // 3. Log the intent first to the database (Auditing)
  const log = await prisma.deviceActionLog.create({
    data: {
      deviceId: params.id,
      userId: currentUserId,
      actionType: "CLI_COMMAND",
      scopeUsed: "command:execute",
      payload: { command: commandString },
      status: "PENDING"
    }
  });

  try {
    // 4. Relay to Teltonika backend securely using your token
    const rmsResponse = await fetch(`https://rms.teltonika-networks.com/api/devices/${params.id}/command`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELTONIKA_RMS_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command: commandString })
    });

    if (!rmsResponse.ok) throw new Error('Teltonika API rejected request');

    // 5. Update state on success
    await prisma.deviceActionLog.update({
      where: { id: log.id },
      data: { status: "SUCCESS" }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // 6. Update state on failure
    await prisma.deviceActionLog.update({
      where: { id: log.id },
      data: { status: "FAILED", errorMessage: error.message }
    });
    return NextResponse.json({ error: 'Failed to execute remote action' }, { status: 500 });
  }
}
```

---

## Project Structure (Next.js App Router)

```
src/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Dashboard / landing
│   ├── api/
│   │   ├── devices/
│   │   │   ├── route.ts        # GET all devices, POST new device
│   │   │   └── [id]/
│   │   │       ├── route.ts    # GET/PUT/DELETE single device
│   │   │       └── execute/
│   │   │           └── route.ts  # POST CLI command execution
│   │   ├── users/
│   │   │   └── route.ts        # User management endpoints
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts    # NextAuth.js handlers
│   ├── devices/
│   │   ├── page.tsx            # Device list page
│   │   └── [id]/
│   │       └── page.tsx        # Single device detail/terminal
│   └── admin/
│       └── page.tsx            # Admin panel (users, roles)
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── teltonika.ts            # Teltonika API wrapper
│   └── auth.ts                 # Auth utilities
├── components/
│   ├── DeviceCard.tsx
│   ├── Terminal.tsx             # CLI passthrough terminal component
│   └── Navbar.tsx
└── middleware.ts                # Route protection middleware
```

---

## Environment Variables

Create a `.env` file (never commit to git):

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/wkm_rms?schema=public"

# Teltonika RMS API
TELTONIKA_RMS_API_TOKEN="your-personal-access-token-here"

# NextAuth
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:3000

# Database
npx prisma generate  # Generate Prisma client
npx prisma migrate dev --name init  # Run migrations
npx prisma studio    # Open database GUI

# Build & Deploy
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint
```

---

## Key Principles

1. **Never expose the Teltonika PAT on the client side** — all RMS API calls go through server-side route handlers.
2. **Audit everything** — every device action is logged in `DeviceActionLog` with the user, action type, scope, and result.
3. **Cache aggressively** — minimize direct Teltonika API calls to stay within rate limits.
4. **Role-based access control** — enforce `SystemRole` checks in middleware and route handlers before proxying to Teltonika.
5. **Use React Server Components** for data-heavy pages; reserve Client Components for interactive elements like the CLI terminal.
