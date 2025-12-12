# WebCrawlerCompanion

## Project Overview

WebCrawlerCompanion is a web-based tool designed to assist with web scraping and DOM element selection. It provides an interactive interface for viewing web pages, selecting DOM elements, and configuring proxy settings for web crawling operations. The application features real-time element selection through WebSocket communication and supports saving selector configurations to a PostgreSQL database.

**Key Features:**
- Interactive web page viewer with zoom controls
- Real-time DOM element selection and highlighting
- CSS selector generation and testing
- Proxy configuration management with rotation strategies
- WebSocket-based real-time communication
- Persistent storage using PostgreSQL

## Technology Stack

### Frontend
- **React 18.3** with TypeScript
- **Vite** for build tooling and development server
- **Wouter** for client-side routing
- **TanStack Query (React Query)** for server state management
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for styling with custom design tokens
- **Framer Motion** for animations
- **Lucide React** for icons
- **React Hook Form** with Zod for form validation

### Backend
- **Node.js** with **Express.js** server
- **TypeScript** throughout the stack
- **WebSocket (ws)** for real-time communication
- **Drizzle ORM** for database operations
- **PostgreSQL** database (using Neon serverless driver)
- **Zod** for runtime validation and schema definition

### Development Tools
- **tsx** for running TypeScript files in development
- **esbuild** for building the server bundle
- **Drizzle Kit** for database migrations
- **Playwright** for browser automation (installed as dependency)

### Python Runtime
- **Python 3.12.0** (pinned via `.python-version`)
- Available for future scripting needs or data processing tasks

## Directory Structure

```
/
├── client/                 # Frontend application
│   └── src/
│       ├── components/     # React components
│       │   └── ui/        # shadcn/ui components
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utility functions and configurations
│       ├── pages/         # Page components (route handlers)
│       ├── App.tsx        # Root application component
│       ├── main.tsx       # Application entry point
│       └── index.css      # Global styles and CSS variables
├── server/                # Backend application
│   ├── index.ts          # Express server setup
│   ├── routes.ts         # API routes and WebSocket handlers
│   ├── storage.ts        # Database operations
│   └── vite.ts           # Vite middleware integration
├── shared/               # Shared code between client and server
│   └── schema.ts        # Drizzle schemas and Zod validators
├── migrations/          # Database migration files
└── dist/               # Build output (gitignored)
```

## Coding Guidelines

### TypeScript

- **Strict mode enabled**: All TypeScript strict checks are enforced
- **No `any` types**: Use proper typing or `unknown` with type guards
- **Path aliases**: Use `@/` for client imports and `@shared/` for shared code
- **ESM modules**: The project uses ES modules (`"type": "module"` in package.json)
- **File extensions**: Use `.ts` for Node.js files, `.tsx` for React components

### React Components

- Use **functional components** with hooks
- Use **TypeScript interfaces** for component props
- Export components as **default exports** for page components
- Export components as **named exports** for utility components (when appropriate)
- Use **PascalCase** for component files (e.g., `ZoomControls.tsx`)
- Define prop interfaces above the component definition
- Use destructuring for props

**Example:**
```typescript
interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export default function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  // Component implementation
}
```

### Styling

- Use **Tailwind CSS** utility classes for styling
- Follow the **shadcn/ui** component patterns
- Use CSS variables for theming (defined in `client/src/index.css`)
- Prefer `className` composition with `cn()` utility from `lib/utils`
- Use **responsive design** utilities (sm:, md:, lg:, etc.)
- Follow the design system colors: background, foreground, primary, secondary, muted, accent, destructive

### Database and Drizzle ORM

- Define all schemas in `shared/schema.ts`
- Use **Drizzle's schema definition API** (pgTable, serial, text, etc.)
- Create **Zod validation schemas** using `createInsertSchema` from `drizzle-zod`
- Use **.pick()** to select only the fields needed for insert operations
- Export **TypeScript types** using `$inferSelect` and `z.infer`
- Use **snake_case** for database column names, **camelCase** in TypeScript

**Example:**
```typescript
export const myTable = pgTable("my_table", {
  id: serial("id").primaryKey(),
  userName: text("user_name").notNull(),
});

export const insertMyTableSchema = createInsertSchema(myTable).pick({
  userName: true
});

export type MyTable = typeof myTable.$inferSelect;
export type InsertMyTable = z.infer<typeof insertMyTableSchema>;
```

### API Routes

- Define routes in `server/routes.ts`
- Use `registerRoutes(app)` pattern for route registration
- Validate request bodies using Zod schemas
- Handle errors gracefully with try-catch blocks
- Return appropriate HTTP status codes
- Use `res.json()` for JSON responses

### WebSocket Communication

- WebSocket server is mounted at `/ws` path
- Message format: `{ type: string, ...data }`
- Message types: `SELECT_ELEMENT`, `HIGHLIGHT_ELEMENT`, `ELEMENT_SELECTED`, `ELEMENT_HIGHLIGHTED`
- Always parse and validate messages in try-catch blocks
- Broadcast to other clients excluding sender when appropriate

### Error Handling

- Use try-catch blocks for async operations
- Log errors to console (consider structured logging for production)
- Return user-friendly error messages in API responses
- Validate all external input (request bodies, query params, WebSocket messages)
- Use Zod for runtime validation

### State Management

- Use **TanStack Query** for server state (API data)
- Use **React hooks** (useState, useReducer) for local component state
- Use **React Context** for shared application state (when needed)
- Prefer **data fetching at the component level** with React Query

## Development Workflow

### Scripts

- **`npm run dev`**: Start development server with hot reload (port 5000)
- **`npm run build`**: Build for production (client + server)
- **`npm run start`**: Start production server
- **`npm run check`**: Run TypeScript type checking
- **`npm run db:push`**: Push database schema changes to PostgreSQL

### Environment Variables

Required environment variables (see `.env.example`):
- **`DATABASE_URL`**: PostgreSQL connection string (required by Drizzle)
- **`NODE_ENV`**: Set to `production` in production environment

Create a `.env` file for local development (do not commit to git).

### Building the Application

1. Client is built first using Vite → outputs to `dist/public`
2. Server is bundled using esbuild → outputs to `dist/index.js`
3. Both steps happen with `npm run build`

### Database Migrations

- Schema is defined in `shared/schema.ts`
- Use `npm run db:push` to sync schema changes to database
- Drizzle Kit configuration is in `drizzle.config.ts`
- Migrations are generated in `./migrations` directory

## Authentication (Future Implementation)

- User authentication is **not currently implemented**
- Future plan: OAuth2 with mailcow/authentik providers
- User schema exists in `shared/schema.ts` but is not yet used
- Session packages (`express-session`, `connect-pg-simple`) are installed but not configured
- When implementing auth:
  - Store tokens securely (httpOnly cookies)
  - Implement CSRF protection
  - Use state parameter for OAuth2 flows
  - Rate limit authentication endpoints

## Security Best Practices

### Input Validation
- **Always validate** user input using Zod schemas
- **Sanitize** HTML content when displaying user-generated or external content
- **Validate** WebSocket messages before processing
- **Check** database query results for null/undefined

### API Security
- Validate request bodies with Zod before processing
- Return appropriate error messages without leaking sensitive information
- Consider implementing rate limiting for production (not yet implemented)
- Use HTTPS in production environments

### Database Security
- Use **parameterized queries** (Drizzle ORM handles this automatically)
- Never concatenate user input into SQL queries
- Use environment variables for database credentials
- Keep database credentials out of source code

### Cross-Site Scripting (XSS)
- React escapes content by default in JSX
- Be careful with `dangerouslySetInnerHTML` (avoid when possible)
- Sanitize any HTML content from external sources
- Validate and sanitize URLs before using them

## Testing

- No test framework is currently configured
- When adding tests, consider: Vitest for unit tests, Playwright for E2E tests
- Test API endpoints with request validation
- Test WebSocket communication flows
- Test database operations with a test database

## Special Requirements

### DO NOT Include in Commits
- `node_modules/` directory
- `dist/` directory (build output)
- `.env` files (contains secrets)
- `.DS_Store` and other OS-specific files
- Editor-specific directories (`.idea/`, `.vscode/`)

### WebSocket Usage
- Always check `client.readyState === WebSocket.OPEN` before sending
- Handle connection errors gracefully
- Implement reconnection logic on the client side
- Parse JSON messages in try-catch blocks

### Proxy Configuration
- Proxies are stored as text arrays in database
- Rotation strategies: specify strategy as text (e.g., "round-robin", "random")
- Validate proxy URLs before saving

### Selector Management
- CSS selectors are stored with optional parent selectors
- Attributes are stored as text arrays
- Each selector is associated with a specific URL
- Validate selectors before saving to prevent malformed entries

## Dependencies to Avoid

### Already Removed
- **DO NOT** add back Replit-specific packages:
  - `@replit/vite-plugin-shadcn-theme-json`
  - `@replit/vite-plugin-cartographer`
  - `@replit/vite-plugin-runtime-error-modal`

### Deprecated or Planned for Removal
- `passport` and `passport-local` - planned migration to OAuth2
- No new local authentication strategies should be added

## Code Review Checklist

Before submitting code:
- [ ] TypeScript types are properly defined (no `any`)
- [ ] All user input is validated with Zod
- [ ] Error handling is implemented for async operations
- [ ] Database operations use Drizzle ORM (no raw SQL)
- [ ] React components follow the established patterns
- [ ] CSS uses Tailwind utilities and follows design system
- [ ] WebSocket messages are validated before processing
- [ ] No sensitive data is logged or exposed in responses
- [ ] Environment variables are used for configuration
- [ ] Code follows ESM import/export patterns
- [ ] Path aliases (`@/`, `@shared/`) are used correctly

## Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zod Documentation](https://zod.dev/)

---

**Note:** This is a living document. Update these instructions as the project evolves, new patterns emerge, or architectural decisions change.
