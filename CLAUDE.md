# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains **suite-marketing-ecommerce**, a collection of marketing and e-commerce applications for a professional suite. Currently, it houses:

- **PreçoCerto** (`/precocerto`): A product pricing calculator and manager application

## Current Project: PreçoCerto

For detailed information about the PreçoCerto application, development setup, and architecture, see `/precocerto/CLAUDE.md`.

### Quick Reference

**What it is:**
- Personal web app for calculating optimal product pricing
- Tracks product costs and calculates recommended selling prices based on desired profit margins
- Dashboard provides business metrics overview

**Tech Stack:**
- Next.js 16 + TypeScript + React 19
- Supabase for authentication and database
- Tailwind CSS for styling

**Key Commands:**
```bash
cd precocerto
npm install
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linting
```

**Key Features:**
- Secure user authentication
- Complete product CRUD (create, read, update, delete)
- Automatic price calculation based on costs and target margins
- Portuguese (Angola) currency formatting

## Repository Structure

```
suite-marketing-ecommerce/
└── precocerto/           # Main application directory
    ├── src/              # Source code
    ├── supabase/         # Database migrations
    ├── public/           # Static assets
    ├── CLAUDE.md         # Detailed development guide
    ├── README.md         # User-facing documentation
    ├── package.json      # Dependencies and scripts
    └── tsconfig.json     # TypeScript configuration
```

## Development Workflow

1. **Before starting:** Read `/precocerto/CLAUDE.md` for the application architecture and conventions
2. **Install dependencies:** `cd precocerto && npm install`
3. **Set up environment:** Copy `.env.local.example` to `.env.local` and add Supabase credentials
4. **Start development:** `npm run dev` (runs on http://localhost:3000)
5. **Make changes** following the code conventions in the application's CLAUDE.md
6. **Test manually** before committing
7. **Commit with clear messages** following conventional commits

## Working with Multiple Applications

Future additions to this repository should:
1. Create a new top-level directory with the application name
2. Include its own `CLAUDE.md` with application-specific guidance
3. Update this root `CLAUDE.md` to reference the new application
4. Maintain consistent TypeScript and tooling configurations where possible

## Important Notes

- Each application in this suite is independent; dependencies and configurations should not be shared
- When working on PreçoCerto, all commands must be run from the `/precocerto` directory
- Environment variables are application-specific and stored in `.env.local` (which is gitignored)

## Quick Links

- PreçoCerto Development Guide: `/precocerto/CLAUDE.md`
- PreçoCerto README: `/precocerto/README.md`
- Supabase Setup: `/precocerto/SUPABASE_SETUP.md`
