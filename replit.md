# Web Scraper Application

## Overview

This is a full-stack web scraper application built with React (frontend) and Express.js (backend). The application provides a comprehensive interface for configuring, running, and managing web scraping operations with advanced features like pagination handling, data filtering, and multiple export formats.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with custom theming
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Web Scraping**: Puppeteer for browser automation
- **Data Export**: Multiple formats (CSV, JSON, XML, XLSX)
- **Session Management**: In-memory storage with database persistence

## Key Components

### Data Storage
- **Database**: PostgreSQL (configured for production)
- **ORM**: Drizzle with TypeScript-first schema definitions
- **Tables**: 
  - `scraping_configurations`: Stores scraping rules and settings
  - `scraping_sessions`: Tracks scraping progress and results
- **Storage Interface**: Abstracted storage layer supporting both memory and database backends

### Web Scraping Engine
- **Browser Automation**: Puppeteer for dynamic content handling
- **Selector Support**: CSS selectors and XPath expressions
- **Pagination**: Automatic navigation through multi-page content
- **User Agent Spoofing**: Multiple browser profiles for different sites
- **Request Throttling**: Configurable delays to respect server limits

### Configuration Management
- **Flexible Selectors**: Multiple data extraction rules per configuration
- **Filtering Options**: Include/exclude patterns for content filtering
- **Scraping Options**: Pagination, dynamic content waiting, duplicate removal
- **Validation**: URL accessibility and selector testing

### Real-time Monitoring
- **Progress Tracking**: Live updates on scraping progress
- **Error Logging**: Detailed error collection and reporting
- **Session Management**: Start, stop, and monitor scraping sessions

## Data Flow

1. **Configuration Creation**: Users define scraping rules through the React interface
2. **Validation**: URLs and selectors are tested before scraping begins
3. **Session Initialization**: Backend creates a new scraping session
4. **Browser Automation**: Puppeteer navigates and extracts data according to configuration
5. **Progress Updates**: Real-time status updates sent to frontend via polling
6. **Data Storage**: Extracted data stored in session results
7. **Export Processing**: Data formatted and exported in requested format

## External Dependencies

### Core Technologies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **puppeteer**: Browser automation for web scraping
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management

### UI Libraries
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Type-safe component variants

### Data Processing
- **json2csv**: CSV export functionality
- **date-fns**: Date manipulation utilities
- **zod**: Runtime type validation

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with HMR
- **Backend**: Node.js with tsx for TypeScript execution
- **Database**: PostgreSQL (local or cloud)
- **Environment**: Replit-optimized with custom error handling

### Production Build
- **Frontend**: Vite production build with asset optimization
- **Backend**: esbuild bundling for Node.js deployment
- **Static Assets**: Served from Express in production
- **Database**: Neon PostgreSQL or compatible PostgreSQL service

### Configuration
- **Environment Variables**: DATABASE_URL for database connection
- **Build Process**: Separate build commands for client and server
- **Deployment**: Single-command deployment with `npm start`

The application is designed to be easily deployable on platforms like Replit, with development-specific tooling and runtime error handling built in.