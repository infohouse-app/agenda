# Appointment Scheduling System

## Overview

This is a modern web application for appointment scheduling with integrated Google Calendar support and WhatsApp notifications. The system is built with a React frontend using TypeScript and shadcn/ui components, an Express.js backend, and PostgreSQL database with Drizzle ORM. The application features a clean, responsive design with automatic calendar synchronization and messaging capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with custom configuration for development and production

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful endpoints with JSON responses
- **Error Handling**: Centralized error middleware with status code mapping

### Database Schema
- **Users Table**: Basic user authentication with username/password
- **Appointments Table**: Comprehensive appointment data including:
  - Personal information (name, phone, email)
  - Service details and notes
  - Date/time scheduling
  - Status tracking and Google Calendar integration
  - WhatsApp notification status

## Key Components

### Client-Side Components
- **SchedulingPopup**: Main appointment booking interface with calendar picker and form
- **ConfigurationModal**: Visual interface for configuring Google Calendar and WhatsApp API credentials
- **Home Page**: Landing page with features overview and call-to-action
- **UI Components**: Complete shadcn/ui component library for consistent design

### Server-Side Modules
- **Storage Layer**: Abstract interface with in-memory implementation (ready for database integration)
- **Route Handlers**: RESTful API endpoints for appointment CRUD operations and configuration management
- **Configuration Management**: API endpoints for storing and testing Google Calendar/WhatsApp credentials
- **Vite Integration**: Development server setup with HMR and static file serving

### Data Flow
1. **Appointment Creation**: User submits form → validation → database storage → Google Calendar sync → WhatsApp notification
2. **Calendar Integration**: Automatic event creation with attendee management and timezone handling
3. **Notification System**: WhatsApp integration for appointment confirmations and reminders

## External Dependencies

### Google Calendar API
- **Purpose**: Automatic calendar event creation and management
- **Configuration**: Requires API key and calendar ID environment variables
- **Features**: Event creation with attendees, timezone support, and conflict detection

### WhatsApp Integration
- **Purpose**: Automated appointment confirmations and reminders
- **Implementation**: Placeholder for webhook-based messaging service
- **Status Tracking**: Database field to track notification delivery

### UI Framework Dependencies
- **Radix UI**: Accessible component primitives for complex interactions
- **Tailwind CSS**: Utility-first styling with custom theme configuration
- **Lucide Icons**: Consistent iconography throughout the application

## Deployment Strategy

### Development Environment
- **Hot Module Replacement**: Vite development server with automatic reload
- **Database**: Local PostgreSQL instance with Drizzle migrations
- **Environment Variables**: Local .env file for API keys and database URL

### Production Build
- **Frontend**: Vite build with optimized bundle splitting and asset optimization
- **Backend**: ESBuild compilation with external package handling
- **Database**: PostgreSQL with connection pooling via Neon serverless
- **Static Assets**: Served through Express with proper caching headers

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **GOOGLE_API_KEY**: Google Calendar API access key
- **GOOGLE_CALENDAR_ID**: Target calendar for event creation
- **NODE_ENV**: Environment detection for development/production behavior

## Changelog
- July 05, 2025. Initial setup
- July 05, 2025. Added visual configuration interface for Google Calendar and WhatsApp API credentials with real-time testing capabilities
- July 05, 2025. Migrated from in-memory storage to PostgreSQL with encrypted configuration storage
- July 05, 2025. Fixed appointment booking system - resolved time slot selection and API endpoint issues
- July 05, 2025. Improved Google Calendar integration to prevent authentication conflicts between API Key and Access Token
- July 06, 2025. Removed API Key support completely - Google Calendar only accepts OAuth2 Access Token for event creation
- July 06, 2025. Added comprehensive instructions for obtaining valid OAuth2 tokens from Google OAuth Playground
- July 06, 2025. Enhanced scheduling popup with fixed footer layout, progress indicators, and responsive design improvements
- July 06, 2025. Prepared project for Cloudflare Workers deployment - created native worker implementation, D1 schema, and cleanup documentation
- July 06, 2025. Implemented permanent OAuth2 system for Google Calendar with automatic token refresh - eliminated 1-hour expiration limitation
- July 06, 2025. Created complete deployment package with Docker, EasyPanel guide, and production configuration for VPS hosting

## User Preferences

Preferred communication style: Simple, everyday language.