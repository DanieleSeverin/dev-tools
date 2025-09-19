# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a hybrid Angular + Tauri application called "dev-tools" - a developer tools suite that combines web frontend capabilities with native desktop functionality. The project uses Angular 17 for the frontend and Tauri v2 for the native backend.

## Development Commands

### Frontend (Angular)
- `npm start` or `ng serve` - Start development server at http://localhost:4200
- `npm run build` or `ng build` - Build the Angular application
- `npm run watch` or `ng build --watch --configuration development` - Build with file watching
- `npm test` or `ng test` - Run unit tests via Karma/Jasmine

### Desktop Application (Tauri)
- `npm run tauri:dev` or `tauri dev` - Start Tauri development mode (builds Angular + starts native app)
- `npm run tauri:build` or `tauri build` - Build production desktop application

### Code Generation
- `ng generate component component-name` - Generate new Angular component with SCSS styling
- Components are generated with SCSS as the default style language

## Architecture

### Frontend Structure
- **Standalone Components**: Uses Angular standalone components (no NgModules)
- **Hash-based Routing**: Configured with `withHashLocation()` for Tauri compatibility (avoids deep-linking issues in production builds)
- **Component Organization**:
  - `src/app/components/` - Reusable UI components (e.g., sidebar)
  - `src/app/tools/` - Feature tools/pages (e.g., hello-world)
  - `src/app/core/` - Core services and utilities

### Backend Structure (Tauri)
- **Rust Backend**: Located in `src-tauri/` directory
- **Library Pattern**: Uses lib/staticlib setup for potential mobile support
- **IPC Commands**: Rust functions exposed to frontend via `#[tauri::command]` macro
- **Entry Points**:
  - `main.rs` - Desktop entry point
  - `lib.rs` - Shared application logic and command handlers

### Key Services
- **TauriService** (`src/app/core/tauri.service.ts`): Centralized service for all Tauri IPC calls with error handling and logging

### Routing Strategy
- Default route redirects to `/hello`
- Uses hash-based routing for Tauri compatibility
- New tools should be added to `app.routes.ts` with the pattern shown in the existing comment

## Tauri Integration Patterns

### Adding New IPC Commands
1. Define Rust command in `src-tauri/src/lib.rs` with `#[tauri::command]`
2. Add command to `.invoke_handler()` in the builder
3. Call from Angular using `TauriService.call<ReturnType>('command_name', args)`

### Frontend-Backend Communication
- Use `TauriService.call()` for type-safe IPC calls
- All Tauri API calls are centralized through this service
- Error handling and logging are built into the service

## File Conventions

- **Angular Components**: Use standalone components with SCSS styling
- **Rust Code**: Follow standard Rust conventions with comprehensive comments
- **TypeScript**: Strict typing enabled, use interfaces for complex types
- **Routing**: Add new tool routes in `app.routes.ts` following the existing pattern

## Build Configurations

- **Development**: Source maps enabled, no optimization
- **Production**: Bundle optimization with size budgets (500kb initial, 1mb max)
- **Component Styles**: 2kb warning, 4kb error limits
- **Tauri v2**: Uses modern Tauri APIs (`@tauri-apps/api/core` for `invoke`)