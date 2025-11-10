# VS Code Copilot Instructions for material_request

This document is intended to guide AI coding agents through this codebase. It outlines key architecture decisions, developer workflows, patterns, and integration points to help you be immediately productive.

## 1. Project Overview

- **Multi-Service Architecture:** The workspace contains multiple services:
  - **calc-server:** Built with NestJS, this service implements core calculation logic. Key files:
    - `calc-server/src/app.module.ts`
    - Modules under `calc-server/src/module.calc`
  - **order-server:** Also powered by NestJS, this service handles order processing and integrates with a Prisma-managed database. Key files:
    - `order-server/src/app.module.ts`
    - Prisma configuration in `order-server/prisma/schema.prisma`
  - **ionic-client:** A Vite project serving as the frontend, with Vue components and custom routing. Key directories:
    - `ionic-client/src/components/`
    - Routes defined in `ionic-client/router/`
- **Shared Code:** Common resources for authentication and other utilities are found under `shared/auth/` and similar directories.

## 2. Developer Workflows

- **Building:**
  - Each server has its own `package.json` with scripts to build and run the application.
  - Execute `npm run build` in the respective server directory; e.g., `calc-server` uses Nest CLI with configurations in `nest-cli.json`.
- **Testing:**
  - End-to-end and unit tests are located in `calc-server/test/` and `order-server/test/` respectively.
  - Use provided scripts like `run-tests.sh` for quick test execution.
- **Docker Integration:**
  - Use the `docker-compose-watch` task (see task configuration in `compose.dev.yaml`) to start the development environment.
- **Database Migrations:**
  - Use Prisma for schema migrations; review `order-server/prisma/schema.prisma` and the migrations folder.

## 3. Project-Specific Conventions and Patterns

- **Module Organization:**
  - Each service follows modular architecture. Controllers, services, and repositories are neatly separated (e.g., see `module.components` in calc-server and similar structure in order-server).
- **Type Safety:**
  - TypeScript is consistently used. Types and interfaces are organized in `src/types/` directories to enforce contracts across modules.
- **Configuration Files:**
  - Docker configurations, ESLint, and Vite configs are tailored to this project. Pay attention to service-specific overrides (e.g., custom Dockerfile configurations in `docker/` directories).

## 4. Integration and Communication

- **Cross-Service Interactions:**
  - Some shared models and DTOs are stored in `shared/` directories, especially for auth and common business entities.
- **External Dependencies:**
  - The project integrates with MQTT (see `config/mqtt/mosquitto.conf`) and possibly other external systems.
- **Frontend-Backend Contract:**
  - The Ionic client communicates with the backend via REST APIs defined in the server modules.

## 5. Examples and Quick Tips

- **Adding a Feature:**
  - Identify the appropriate module (e.g., a new API endpoint might go under `order-server/src/zayavka/`).
  - Follow existing patterns, such as naming conventions from `calc-server/module.calc`.
- **Debugging:**
  - Use NestJS debugging configurations and VS Code launch settings tailored to each project.
- **Common Commands:**
  - Use `docker compose -f compose.dev.yaml -p matli-dev watch` to spin up the development environment.
