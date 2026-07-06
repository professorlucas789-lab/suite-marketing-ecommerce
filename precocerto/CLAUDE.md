# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PreçoCerto** is a personal web application for calculating and organizing product pricing. It's built with modern web technologies and provides tools for managing products, calculating optimal pricing based on desired margins, and tracking business metrics.

**Key Features:**
- User authentication and account management via Supabase
- Product management (CRUD operations)
- Automatic price calculation based on cost and desired margin
- Dashboard with business statistics (total cost, revenue, profit)
- Portuguese (Angola) currency formatting (Kz - Kwanza)
- Row-level security ensuring users only access their own data

## Technology Stack

- **Frontend Framework**: Next.js 16.2.9 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + PostCSS
- **UI Components**: shadcn/ui + Lucide Icons
- **Forms**: React Hook Form 7.80.0
- **Validation**: Zod 4.4.3
- **Backend/Database**: Supabase (PostgreSQL)
- **Linting**: ESLint 9

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier available)

### Installation & Environment

```bash
# Install dependencies
npm install

# Set up environment variables
# Copy example and add Supabase credentials
cp .env.local.example .env.local
```

Required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL migration in `supabase/migrations/001_create_products_table.sql` in Supabase SQL Editor
3. Add the URL and anon key to `.env.local`

The migration creates:
- `products` table with columns for product details (name, category, costs, margins)
- RLS policies restricting access to authenticated users' own products
- Automatic `updated_at` timestamp tracking

## Common Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Run linting with automatic fixes
npm run lint -- --fix
```

## Project Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with auth wrapper
│   ├── page.tsx            # Dashboard (authenticated)
│   ├── login/page.tsx      # Login page
│   ├── signup/page.tsx     # Sign up page
│   └── products/           # Product management pages
│       ├── page.tsx        # Product list
│       ├── new/page.tsx    # Create new product
│       └── [id]/edit/page.tsx  # Edit product
├── components/
│   ├── ui/                 # Base UI components (Button, Input, Form)
│   ├── layout/             # Layout components (Nav, AuthLayout)
│   ├── products/           # Product-specific components
│   └── dashboard/          # Dashboard components
├── lib/
│   ├── supabase.ts         # Supabase client factory
│   ├── schemas.ts          # Zod validation schemas
│   ├── calculations.ts     # Core pricing calculation logic
│   └── types/              # TypeScript type definitions
├── middleware.ts           # Route protection middleware
└── app/globals.css        # Global styles

supabase/
└── migrations/             # Database migration scripts
```

### Key Patterns

#### Authentication Flow
- Middleware (`src/middleware.ts`) checks for Supabase auth token (`sb-auth-token`)
- Protects all routes except `/login` and `/signup`
- Uses Supabase SSR client for secure session management
- Login/signup pages redirect authenticated users to dashboard

#### Data Validation
- All form inputs validated with Zod schemas in `src/lib/schemas.ts`
- Separate schemas for: sign up, sign in, product creation/editing
- Client-side validation through React Hook Form integration
- Margin values constrained to 0-99.99% to prevent invalid pricing calculations

#### Product Pricing Calculations
The core calculation engine in `src/lib/calculations.ts`:

```
Total Cost = Cost of Purchase + Transport + Packaging + Other Costs

Recommended Price = Total Cost / (1 - Desired Margin / 100)
  [Ensures target margin is achieved]

Estimated Profit = Recommended Price - Total Cost

Real Margin = (Estimated Profit / Recommended Price) × 100
  [Actual margin achieved]
```

All prices formatted in Angolan Kwanza (AOA) using `formatCurrency()`.

#### Database Schema
The `products` table includes:
- `id`, `created_at`, `updated_at` (system fields)
- `user_id` (foreign key to auth.users for RLS)
- Product details: `name`, `category`, `supplier`, `notes`
- Costs: `cost_of_purchase`, `transport_cost`, `packaging_cost`, `other_costs`
- Margin: `desired_margin`

RLS policies ensure users can only read/write their own products.

## Code Conventions

### TypeScript
- Strict mode enabled; all types must be explicitly declared
- Use path alias `@/*` for imports (e.g., `import { Button } from '@/components/ui/button'`)
- Infer types from Zod schemas using `z.infer<typeof schema>`

### Component Structure
- Use functional components with React hooks
- Server components by default in App Router (unless `'use client'` needed)
- UI components in `components/ui/` are reusable and mostly unstyled
- Feature components (products, dashboard) in domain-specific folders

### Styling
- Tailwind CSS for all styling; no inline styles
- Use class-variance-authority for component variants
- clsx/tailwind-merge for dynamic class combinations
- Global styles in `app/globals.css`

### Forms
- Use React Hook Form with Zod validation
- Define form schema in `lib/schemas.ts`
- Use `Form` component wrapper from shadcn/ui
- Always show validation errors inline

## Supabase & Environment

### Client vs. Server Usage
- Supabase client (`createClient()`) used in browser/client components
- For server-side operations, Supabase SDK with service role key would be needed (not currently in use)
- Session management relies on cookies set by Supabase Auth

### RLS (Row-Level Security)
- All data access is restricted to authenticated users
- Products table has RLS enabled
- Queries automatically filtered by `user_id` of authenticated session
- Never bypass RLS; validate that user owns resource on backend if adding mutations

## Next.js Version Notes

⚠️ **This project uses Next.js 16.2.9**, which may have differences from your training data:
- App Router is the standard (no Pages Router)
- Server components default; use `'use client'` directive when state/hooks needed
- Dynamic imports and lazy loading use `next/dynamic`
- Environment variables: `NEXT_PUBLIC_*` exposed to client, others server-only
- Middleware runs on edge runtime

Refer to `node_modules/next/dist/docs/` for latest API documentation if behavior differs from expectations.

## Testing & Validation

Current testing approach:
- No automated test suite yet (Etapa 1 - Base Functional)
- Manual testing of auth flow, product CRUD, and calculations recommended
- Zod schemas provide runtime validation on form submission

Future considerations:
- Unit tests for `calculations.ts` (core business logic)
- E2E tests for auth and product workflows
- API route tests if backend extends beyond Supabase

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository in Vercel dashboard
3. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy (automatic on push to main)

### Other Platforms
Compatible with any Node.js hosting: Railway, Render, Netlify, etc.

## Common Tasks

### Adding a New Product Field
1. Update database schema in Supabase (add column to `products` table)
2. Update `productSchema` in `src/lib/schemas.ts`
3. Update `ProductInput` type (inferred from schema)
4. Update `ProductForm` component
5. Update `ProductList` or display components to show field
6. Update `calculations.ts` if field affects pricing

### Modifying Pricing Logic
- All calculations in `src/lib/calculations.ts`
- Update both the function and the README calculation formulas
- Test edge cases: 0 cost, 99.99% margin, missing optional costs

### Changing Currency
- Update locale in `formatCurrency()`: currently `'pt-AO'` (Portuguese Angola)
- Change currency code if needed (currently `'AOA'`)
- This affects dashboard display and product list

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Hook Form Guide](https://react-hook-form.com/)
- [Zod Documentation](https://zod.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
