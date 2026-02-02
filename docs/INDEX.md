# drAIn Documentation Index

Complete index of all documentation files in the drAIn project.

## Getting Started

Start here if you're new to the project:

1. [Main README](../README.md) - Project overview and setup
2. [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) - Understand how the system works
3. [Dashboard Quick Start](guides/DASHBOARD_QUICK_START.md) - Get started with the dashboard

## Documentation by Category

### Architecture

Understand the technical design and structure of drAIn.

| Document                                                   | Description                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) | Complete overview of system structure, components, and integration |
| [Tech Stack](architecture/TECH_STACK.md)                   | Detailed breakdown of all technologies, libraries, and tools       |
| [Data Flow](architecture/DATA_FLOW.md)                     | How data moves through the system from user to database            |

### API Reference

Technical reference for backend APIs and integrations.

| Document                                 | Description                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| [Supabase API](api/SUPABASE.md)          | Database operations, authentication, storage, and real-time subscriptions |
| [SWMM Simulation API](api/SIMULATION.md) | Storm Water Management Model simulation endpoints and usage               |

### Components

Documentation for React components and their usage.

| Document                                             | Description                                      |
| ---------------------------------------------------- | ------------------------------------------------ |
| [Component Overview](components/README.md)           | Guide to all React components in the application |
| [DataFlow Component](components/data-flow-README.md) | Animated SVG pipeline visualization component    |

### User Guides

Step-by-step guides for using drAIn features.

| Document                                                 | Description                                  |
| -------------------------------------------------------- | -------------------------------------------- |
| [Dashboard Quick Start](guides/DASHBOARD_QUICK_START.md) | Getting started with the analytics dashboard |
| [Event Widget Guide](guides/EVENT_WIDGET_GUIDE.md)       | Using the event notification system          |
| [Flood Reports Guide](guides/FLOOD_REPORTS_GUIDE.md)     | How to submit and manage flood reports       |

### Features

Documentation for major features and implementations.

| Document                                                                     | Description                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------- |
| [Dashboard Implementation](features/DASHBOARD_IMPLEMENTATION_COMPLETE.md)    | Complete dashboard feature documentation          |
| [Dashboard Implementation Plan](features/DASHBOARD_IMPLEMENTATION_PLAN.md)   | Original implementation plan and design decisions |
| [PostGIS Barangay Zones](features/POSTGIS_BARANGAY_ZONES.md)                 | Geographic zone implementation with PostGIS       |
| [PostGIS Implementation Summary](features/POSTGIS_IMPLEMENTATION_SUMMARY.md) | Summary of PostGIS integration                    |

### Development

Resources for developers contributing to the project.

| Document                                      | Description                           |
| --------------------------------------------- | ------------------------------------- |
| [Fixes Applied](development/FIXES_APPLIED.md) | History of bug fixes and improvements |

## Documentation by Audience

### For New Users

1. [Main README](../README.md)
2. [Dashboard Quick Start](guides/DASHBOARD_QUICK_START.md)
3. [Flood Reports Guide](guides/FLOOD_REPORTS_GUIDE.md)

### For Developers

1. [System Architecture](architecture/SYSTEM_ARCHITECTURE.md)
2. [Tech Stack](architecture/TECH_STACK.md)
3. [Component Overview](components/README.md)
4. [Supabase API](api/SUPABASE.md)

### For DevOps/Infrastructure

1. [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) - Deployment section
2. [Tech Stack](architecture/TECH_STACK.md) - Hosting and CI/CD
3. [Supabase API](api/SUPABASE.md) - Database setup

### For Data Scientists/Engineers

1. [SWMM Simulation API](api/SIMULATION.md)
2. [PostGIS Implementation](features/POSTGIS_IMPLEMENTATION_SUMMARY.md)
3. [Data Flow](architecture/DATA_FLOW.md)

## Documentation by Task

### Setting Up the Project

1. [Main README](../README.md) - Installation instructions
2. [Tech Stack](architecture/TECH_STACK.md) - Environment variables

### Understanding the Codebase

1. [System Architecture](architecture/SYSTEM_ARCHITECTURE.md)
2. [Data Flow](architecture/DATA_FLOW.md)
3. [Component Overview](components/README.md)

### Working with the Database

1. [Supabase API](api/SUPABASE.md)
2. [PostGIS Implementation](features/POSTGIS_IMPLEMENTATION_SUMMARY.md)

### Running Simulations

1. [SWMM Simulation API](api/SIMULATION.md)
2. [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) - Simulation Module section

### Building UI Components

1. [Component Overview](components/README.md)
2. [DataFlow Component](components/data-flow-README.md)
3. [Tech Stack](architecture/TECH_STACK.md) - Styling section

### Deploying to Production

1. [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) - Deployment Architecture
2. [Tech Stack](architecture/TECH_STACK.md) - Deployment section

## Quick Reference

### Key Concepts

- **SWMM**: Storm Water Management Model - EPA's hydraulic simulation software
- **PostGIS**: PostgreSQL extension for geographic data
- **Supabase**: Backend-as-a-Service providing database, auth, and storage
- **GeoJSON**: Format for encoding geographic data structures
- **Next.js App Router**: File-system based routing with server components
- **Radix UI**: Unstyled, accessible component primitives
- **Mapbox GL**: JavaScript library for interactive maps

### Common Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript compiler

# Package Management
pnpm install          # Install dependencies
pnpm update           # Update dependencies
```

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

# Railway (Simulation API)
NEXT_PUBLIC_RAILWAY_URL=your_railway_url

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
```

## File Locations

### Static Assets

- GeoJSON data: `public/drainage/*.geojson`
- Images: `public/images/`
- Icons: `public/icons/`

### Source Code

- Pages: `app/`
- Components: `components/`
- Utilities: `lib/`
- Hooks: `hooks/`
- Styles: `app/globals.css`

### Configuration

- TypeScript: `tsconfig.json`
- ESLint: `eslint.config.mjs`
- Tailwind: `tailwind.config.js` (generated)
- Next.js: `next.config.ts`
- Package: `package.json`

## Contributing to Documentation

When adding new documentation:

1. Place it in the appropriate category folder
2. Update this index
3. Add links from related documents
4. Follow the existing format and style
5. Include code examples where applicable
6. Add a table of contents for long documents

### Documentation Style Guide

- Use Markdown format
- Include code blocks with syntax highlighting
- Add examples for technical concepts
- Keep paragraphs concise
- Use tables for reference data
- Include diagrams where helpful
- Link to related documentation

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/eliseoalcaraz/drAIn/issues)
- **Discussions**: [GitHub Discussions](https://github.com/eliseoalcaraz/drAIn/discussions)
- **Email**: Contact the maintainers

## Documentation Status

| Category      | Status         | Last Updated |
| ------------- | -------------- | ------------ |
| Architecture  | ✅ Complete    | 2026-01-30   |
| API Reference | ✅ Complete    | 2026-01-30   |
| Components    | ✅ Complete    | 2026-01-30   |
| User Guides   | ✅ Complete    | 2026-01-30   |
| Features      | ✅ Complete    | 2026-01-30   |
| Development   | 🔄 In Progress | 2026-01-30   |

## Roadmap

Future documentation to be added:

- [ ] Deployment Guide
- [ ] Testing Guide
- [ ] Contributing Guide
- [ ] Security Best Practices
- [ ] Performance Optimization Guide
- [ ] Troubleshooting Guide
- [ ] API Rate Limits and Quotas
- [ ] Backup and Recovery Procedures

---

**Last Updated**: January 30, 2026
**Documentation Version**: 1.0
**Project Version**: Beta (Next.js 15.5.4)
