# WebCrawlerCompanion - Replit Dependencies and Upgrade Recommendations

## Executive Summary
This document outlines Replit-specific dependencies, outdated packages, and recommendations for migrating the authentication system from passport-local to OAuth2 with mailcow/authentik providers.

---

## 1. Replit-Specific Dependencies and Configurations

### 1.1 Replit NPM Packages

The following Replit-specific packages are currently in use:

#### **@replit/vite-plugin-shadcn-theme-json** (v0.0.4)
- **Location**: `package.json` (dependencies)
- **Usage**: `vite.config.ts` - Imports and uses the theme plugin
- **Purpose**: Enables Replit's theme.json integration with shadcn UI components
- **Replacement**: 
  - Remove the package from dependencies
  - Remove `themePlugin()` from vite.config.ts
  - Manage themes directly through CSS variables in your application
  - The `theme.json` file can be removed or converted to a standard config

#### **@replit/vite-plugin-cartographer** (v0.0.2)
- **Location**: `package.json` (devDependencies)
- **Usage**: `vite.config.ts` - Conditionally loaded based on `REPL_ID` env var
- **Purpose**: Replit-specific development tooling for code navigation
- **Replacement**:
  - Remove the package from devDependencies
  - Remove the conditional cartographer plugin block from vite.config.ts (lines 15-22)
  - Use standard VS Code or alternative IDE navigation features

#### **@replit/vite-plugin-runtime-error-modal** (v0.0.3)
- **Location**: `package.json` (devDependencies)
- **Usage**: `vite.config.ts` - Applied as a Vite plugin
- **Purpose**: Shows runtime errors in a modal overlay during development
- **Replacement**:
  - Remove the package from devDependencies
  - Remove `runtimeErrorOverlay()` from vite.config.ts
  - Use browser DevTools console or Vite's built-in error overlay
  - Alternative: Consider `vite-plugin-checker` for TypeScript and ESLint errors

### 1.2 Replit Configuration Files

#### **.replit** Configuration File
- **Location**: `./.replit`
- **Replit-Specific Features**:
  - `modules = ["nodejs-20", "web", "postgresql-16"]` - Replit Nix modules
  - `[nix]` section with channel specification
  - `[deployment]` section configured for Google Cloud Run
  - Port forwarding configuration (4 ports mapped)
  - Workflow automation for run button
- **Replacement Actions**:
  - **Delete** the `.replit` file entirely
  - Create a standard `docker-compose.yml` for local development:
    ```yaml
    version: '3.8'
    services:
      app:
        build: .
        ports:
          - "5000:5000"
        environment:
          - DATABASE_URL=${DATABASE_URL}
          - NODE_ENV=development
        volumes:
          - ./:/app
          - /app/node_modules
      postgres:
        image: postgres:16
        environment:
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
          POSTGRES_DB: webcrawler
        ports:
          - "5432:5432"
        volumes:
          - postgres_data:/var/lib/postgresql/data
    volumes:
      postgres_data:
    ```
  - Create a `Dockerfile` for containerized deployment
  - For deployment, use standard cloud providers (AWS, GCP, Azure) with their native configurations

#### **theme.json** File
- **Location**: `./theme.json`
- **Purpose**: Replit-specific theme configuration
- **Current Content**:
  ```json
  {
    "variant": "professional",
    "primary": "hsl(222.2 47.4% 11.2%)",
    "appearance": "light",
    "radius": 0.5
  }
  ```
- **Replacement**:
  - Convert to CSS variables in `client/src/index.css`
  - Delete the `theme.json` file
  - Implement theme switching using React Context or a state management solution

### 1.3 Environment Variables

#### **REPL_ID Environment Variable**
- **Location**: `vite.config.ts` (line 16)
- **Usage**: Conditional check to enable cartographer plugin only in Replit
- **Replacement**: Remove the check after removing the cartographer plugin

#### **DATABASE_URL Environment Variable**
- **Location**: `drizzle.config.ts`
- **Status**: Standard PostgreSQL connection string - **No changes needed**
- **Note**: Currently using `@neondatabase/serverless` which is Neon-specific but portable

---

## 2. Authentication System Review

### 2.1 Current Authentication Implementation

#### **Current Stack**:
- **passport** (v0.7.0) - Authentication middleware
- **passport-local** (v1.0.0) - Local username/password strategy
- **express-session** (v1.18.2) - Session management
- **connect-pg-simple** (v10.0.0) - PostgreSQL session store (not yet implemented)
- **memorystore** (v1.6.7) - In-memory session store (currently used)

#### **Current Implementation Status**:
⚠️ **Authentication is NOT currently implemented** in the codebase:
- No auth routes found in `server/routes.ts`
- No passport configuration in `server/index.ts`
- No user schema in `shared/schema.ts`
- No login/signup UI components in client
- The packages are installed but unused

### 2.2 OAuth2 Migration Plan

#### **Recommended OAuth2 Stack**:

1. **Remove Current Packages**:
   ```bash
   npm uninstall passport passport-local memorystore
   ```

2. **Install OAuth2 Packages**:
   ```bash
   npm install @node-oauth/express-oauth-server oauth2-server
   npm install passport-oauth2
   npm install jsonwebtoken
   npm install @types/jsonwebtoken --save-dev
   ```

3. **Session Management**:
   - Keep `express-session` for session management
   - Keep `connect-pg-simple` and implement PostgreSQL session store
   - Add JWT for stateless API authentication

#### **Provider Configuration**:

##### **Mailcow OAuth2 Setup**:
- **Authorization Endpoint**: `https://<mailcow-domain>/oauth/authorize`
- **Token Endpoint**: `https://<mailcow-domain>/oauth/token`
- **User Info Endpoint**: `https://<mailcow-domain>/oauth/userinfo`
- **Required Scopes**: `openid`, `email`, `profile`

##### **Authentik OAuth2 Setup**:
- **Authorization Endpoint**: `https://<authentik-domain>/application/o/authorize/`
- **Token Endpoint**: `https://<authentik-domain>/application/o/token/`
- **User Info Endpoint**: `https://<authentik-domain>/application/o/userinfo/`
- **Required Scopes**: `openid`, `email`, `profile`

#### **Implementation Steps**:

1. **Add User Schema** (`shared/schema.ts`):
   ```typescript
   export const users = pgTable("users", {
     id: serial("id").primaryKey(),
     email: text("email").notNull().unique(),
     name: text("name").notNull(),
     provider: text("provider").notNull(), // 'mailcow' or 'authentik'
     providerId: text("provider_id").notNull(),
     createdAt: timestamp("created_at").defaultNow(),
     lastLogin: timestamp("last_login")
   });
   ```

2. **Create Auth Routes** (`server/auth.ts` - new file):
   - `/api/auth/mailcow` - Initiate Mailcow OAuth flow
   - `/api/auth/mailcow/callback` - Mailcow callback handler
   - `/api/auth/authentik` - Initiate Authentik OAuth flow
   - `/api/auth/authentik/callback` - Authentik callback handler
   - `/api/auth/logout` - Logout endpoint
   - `/api/auth/me` - Get current user info

3. **Environment Variables** (create `.env.example`):
   ```
   # Mailcow OAuth2
   MAILCOW_CLIENT_ID=your_client_id
   MAILCOW_CLIENT_SECRET=your_client_secret
   MAILCOW_DOMAIN=https://mail.example.com
   
   # Authentik OAuth2
   AUTHENTIK_CLIENT_ID=your_client_id
   AUTHENTIK_CLIENT_SECRET=your_client_secret
   AUTHENTIK_DOMAIN=https://auth.example.com
   
   # Session
   SESSION_SECRET=generate_random_secret
   
   # Database
   DATABASE_URL=postgresql://user:pass@localhost:5432/db
   
   # App
   APP_URL=http://localhost:5000
   ```

4. **Client-Side Changes**:
   - Create login page with provider selection (Mailcow/Authentik)
   - Add authentication context/provider
   - Implement protected routes
   - Add user profile component
   - Handle authentication redirects

5. **Middleware**:
   - Create `requireAuth` middleware for protected routes
   - Add JWT validation middleware for API endpoints
   - Implement CSRF protection

---

## 3. Dependency Upgrades

### 3.1 Major Version Updates Available

⚠️ **Breaking Changes Expected** - Test thoroughly after upgrading

#### **React Ecosystem** (Major Update):
- **react**: 18.3.1 → **19.2.1** (Major version bump)
- **react-dom**: 18.3.1 → **19.2.1** (Major version bump)
- **@types/react**: 18.3.11 → **19.x** (Major version bump)
- **@types/react-dom**: 18.3.1 → **19.x** (Major version bump)
- **Impact**: React 19 includes new features and may have breaking changes
- **Action**: Review React 19 migration guide before upgrading

#### **UI Component Libraries**:
- **react-day-picker**: 8.10.1 → **9.12.0** (Major version bump)
- **react-resizable-panels**: 2.1.9 → **3.0.6** (Major version bump)
- **recharts**: 2.15.4 → **3.5.1** (Major version bump)
- **Action**: Check changelogs for API changes

#### **Form & Data Libraries**:
- **@hookform/resolvers**: 3.10.0 → **5.2.2** (Major version bump)
- **zod**: 3.25.76 → **4.1.13** (Major version bump)
- **zod-validation-error**: 3.5.4 → **5.0.0** (Major version bump)
- **Action**: Review Zod v4 breaking changes

#### **Database & ORM**:
- **drizzle-orm**: 0.39.3 → **0.45.0** (Minor version updates available)
- **drizzle-zod**: 0.7.1 → **0.8.3** (Minor version update)
- **@neondatabase/serverless**: 0.10.4 → **1.0.2** (Major version bump)
- **Action**: Review Neon SDK v1.0 changes

#### **Styling**:
- **tailwind-merge**: 2.6.0 → **3.4.0** (Major version bump)
- **framer-motion**: 11.18.2 → **12.23.25** (Major version bump)
- **Action**: Check for animation API changes

#### **Server**:
- **express**: 4.22.1 → **5.2.1** (Major version bump)
- **Action**: Express 5 has breaking changes - review migration guide
- **Alternative**: Consider migrating to Fastify or Hono for better TypeScript support

#### **Date Handling**:
- **date-fns**: 3.6.0 → **4.1.0** (Major version bump)
- **Action**: Review date-fns v4 breaking changes

### 3.2 Minor/Patch Updates (Safe to Update)

These can be updated with minimal risk:

- **@tanstack/react-query**: 5.90.12 → 5.90.12 (up to date)
- **lucide-react**: 0.453.0 → **0.556.0**
- **wouter**: 3.8.1 → 3.8.1 (up to date)
- **ws**: 8.18.3 → 8.18.3 (up to date)
- **playwright**: 1.57.0 → 1.57.0 (up to date)
- All **@radix-ui/** packages are up to date

### 3.3 Recommended Upgrade Strategy

#### **Phase 1: Safe Updates** (Low Risk)
```bash
npm update lucide-react
npm update embla-carousel-react
npm update input-otp
```

#### **Phase 2: Medium Risk Updates** (Test Required)
```bash
npm install drizzle-orm@latest drizzle-zod@latest
npm install framer-motion@latest
npm install @neondatabase/serverless@latest
```

#### **Phase 3: High Risk Updates** (Breaking Changes)
Update one at a time and test thoroughly:

1. **React 19 Migration**:
   ```bash
   npm install react@19 react-dom@19 @types/react@19 @types/react-dom@19
   ```
   - Test all components
   - Update any deprecated APIs
   
2. **Zod v4 Migration**:
   ```bash
   npm install zod@4 zod-validation-error@5 @hookform/resolvers@5
   ```
   - Review form validations
   - Test all API endpoints with validation
   
3. **Express v5 Migration** (Optional - consider alternatives):
   ```bash
   npm install express@5 @types/express@5
   ```
   - Or consider: Fastify, Hono, or Elysia for better TypeScript support

4. **UI Library Updates**:
   ```bash
   npm install react-day-picker@9 react-resizable-panels@3 recharts@3
   ```
   - Update component usage as needed

### 3.4 New Dependency Recommendations

#### **Add for OAuth2 Implementation**:
```bash
npm install jsonwebtoken dotenv
npm install @types/jsonwebtoken --save-dev
```

#### **Consider Adding**:
- **helmet** - Security headers middleware
- **cors** - CORS configuration (if needed for API)
- **rate-limiter-flexible** - Rate limiting for auth endpoints
- **bcrypt** - If you need local password hashing as fallback
- **joi** or keep **zod** - Request validation
- **winston** - Structured logging (replace console.log)
- **pino** - High-performance logging alternative

---

## 4. Code Modifications Required

### 4.1 vite.config.ts Changes

**Current Code** (lines 1-23):
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  // ... rest
```

**Replacement Code**:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
  ],
  // ... rest remains the same
```

### 4.2 Files to Delete

- `.replit` - Replit-specific configuration
- `theme.json` - Replit theme integration (convert to CSS)
- `generated-icon.png` - Replit-generated file (regenerate with your own tooling)

### 4.3 Files to Create

1. **docker-compose.yml** - Local development environment
2. **Dockerfile** - Container definition
3. **.env.example** - Environment variable template
4. **server/auth.ts** - OAuth2 authentication logic
5. **server/middleware/requireAuth.ts** - Authentication middleware
6. **client/src/contexts/AuthContext.tsx** - Client-side auth state
7. **client/src/pages/Login.tsx** - Login page with provider selection
8. **migrations/** - Directory for database migrations (if not exists)

---

## 5. Database Considerations

### 5.1 Current Database Setup

- Using `drizzle-orm` with PostgreSQL
- Configuration in `drizzle.config.ts`
- Using `@neondatabase/serverless` for Neon Database (cloud PostgreSQL)
- Schema defined in `shared/schema.ts`
- **Current tables**: `proxy_configs`, `selectors`
- **Missing**: User authentication tables

### 5.2 Database Recommendations

1. **Session Storage**:
   - Switch from `memorystore` to `connect-pg-simple` (already installed)
   - Add session table migration
   - Configure in `server/index.ts`

2. **Add Auth Tables**:
   - `users` table for user profiles
   - `sessions` table for express-session (via connect-pg-simple)
   - Optional: `refresh_tokens` table for JWT refresh tokens

3. **Migration Strategy**:
   ```bash
   npm run db:push  # Apply schema changes
   ```

4. **Consider Connection Pooling**:
   - For production, use PgBouncer or similar
   - Neon includes connection pooling

---

## 6. Security Recommendations

### 6.1 Immediate Security Enhancements

1. **Add Environment Variables Validation**:
   - Use `zod` to validate environment variables on startup
   - Fail fast if critical variables are missing

2. **Add Security Middleware**:
   ```bash
   npm install helmet cors express-rate-limit
   ```

3. **CSRF Protection**:
   - Implement CSRF tokens for state-changing operations
   - Use `csurf` or built-in protection

4. **Input Validation**:
   - Already using Zod schemas - ensure all endpoints validate input
   - Sanitize HTML in DOM viewer to prevent XSS

5. **Rate Limiting**:
   - Add rate limiting to auth endpoints
   - Protect API endpoints from abuse

### 6.2 OAuth2 Security Considerations

1. **State Parameter**: Always validate OAuth state to prevent CSRF
2. **PKCE**: Implement PKCE for public clients if applicable
3. **Token Storage**: Store tokens securely (httpOnly cookies for web)
4. **Token Rotation**: Implement refresh token rotation
5. **Scope Validation**: Only request necessary scopes

---

## 7. Development Workflow Improvements

### 7.1 Recommended npm Scripts Additions

Add to `package.json`:
```json
{
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

### 7.2 Add Development Tools

Consider adding:
```bash
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier
npm install -D vitest @vitest/ui
npm install -D husky lint-staged  # Git hooks
```

---

## 8. Deployment Strategy

### 8.1 Move Away from Replit Deployment

Current `.replit` specifies Google Cloud Run. Alternatives:

#### **Option 1: Docker + Any Platform**
- Build Docker image
- Deploy to: Railway, Render, Fly.io, AWS ECS, GCP Cloud Run, Azure Container Apps

#### **Option 2: Vercel/Netlify (with adapter)**
- Frontend: Vercel/Netlify
- Backend: Separate deployment (Railway, Render)
- Or use Vercel Edge Functions

#### **Option 3: Traditional VPS**
- Use PM2 or systemd for process management
- Nginx as reverse proxy
- Manual deployment or CI/CD

### 8.2 CI/CD Pipeline

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test
      # Add deployment steps
```

---

## 9. Summary of Actions

### 9.1 Immediate Actions (Remove Replit Dependencies)

1. ✅ Remove Replit npm packages:
   ```bash
   npm uninstall @replit/vite-plugin-shadcn-theme-json @replit/vite-plugin-cartographer @replit/vite-plugin-runtime-error-modal
   ```

2. ✅ Update `vite.config.ts` (remove Replit plugins)

3. ✅ Delete `.replit` file

4. ✅ Delete `theme.json` file (convert to CSS variables)

5. ✅ Create Docker/docker-compose setup

### 9.2 Short-term Actions (Auth Migration)

1. ✅ Remove unused auth packages:
   ```bash
   npm uninstall passport passport-local memorystore
   ```

2. ✅ Install OAuth2 dependencies

3. ✅ Add user schema and migrations

4. ✅ Implement OAuth2 routes and middleware

5. ✅ Create login UI and auth context

6. ✅ Configure OAuth2 providers (Mailcow & Authentik)

### 9.3 Medium-term Actions (Dependency Updates)

1. ✅ Update safe dependencies (Phase 1)

2. ✅ Update medium-risk dependencies (Phase 2) with testing

3. ✅ Plan React 19 migration (Phase 3)

4. ✅ Consider Express alternatives or upgrade to Express 5

### 9.4 Long-term Actions (Improvements)

1. ✅ Add comprehensive testing (unit, integration)

2. ✅ Set up CI/CD pipeline

3. ✅ Implement logging and monitoring

4. ✅ Add error tracking (Sentry, etc.)

5. ✅ Performance optimization

---

## 10. Estimated Effort

- **Replit Removal**: 2-4 hours
- **OAuth2 Implementation**: 8-16 hours
- **Dependency Updates (Safe)**: 1-2 hours
- **Dependency Updates (Breaking)**: 8-12 hours
- **Docker Setup**: 2-4 hours
- **Testing & Validation**: 8-16 hours

**Total Estimated Effort**: 29-54 hours

---

## 11. Risks and Mitigation

### 11.1 Risks

1. **Breaking Changes**: Major version updates may break existing functionality
2. **Auth Migration**: OAuth2 implementation requires careful security consideration
3. **Database Changes**: Schema changes need proper migration strategy
4. **Deployment Changes**: Moving off Replit requires new deployment setup

### 11.2 Mitigation Strategies

1. **Incremental Updates**: Update dependencies in phases, test thoroughly
2. **Feature Flags**: Use feature flags for OAuth2 rollout
3. **Database Backups**: Always backup before schema changes
4. **Staging Environment**: Test all changes in staging before production
5. **Rollback Plan**: Maintain ability to rollback to previous version

---

## 12. Additional Notes

- Current application has **no authentication implemented** despite having packages installed
- The app uses in-memory storage (`MemStorage`) - needs database connection for production
- WebSocket functionality is implemented for element selection features
- The app fetches and displays DOM content from external URLs
- Consider adding rate limiting for the `/api/fetch-dom` endpoint to prevent abuse

---

## Questions for Clarification

1. **OAuth2 Providers**: Do you have Mailcow and Authentik instances already set up?
2. **Database**: Are you planning to use Neon, or switch to a different PostgreSQL provider?
3. **Deployment**: What is your preferred deployment platform after moving from Replit?
4. **User Roles**: Will the application need role-based access control (RBAC)?
5. **Existing Users**: Are there existing users to migrate, or is this a fresh start?

---

*Document generated on: 2025-12-08*
*Project: WebCrawlerCompanion*
*Analysis version: 1.0*
