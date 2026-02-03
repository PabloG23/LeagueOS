# LeagueOS - Sports League Management Platform

LeagueOS is a Multi-Tenant SaaS platform for managing sports leagues, built with a **Modular Monolith** architecture.

## Tech Stack

### Backend
- **Java 21** & **Spring Boot 3.2+**
- **Spring Modulith**: For strict logical boundaries between modules.
- **PostgreSQL**: Shared database with shared schema multi-tenancy.
- **Hibernate Filters**: Automatic data scoping by `tenant_id`.
- **Strategy Pattern**: Modular rule sets for different sports (Soccer, Basketball, etc.).

### Frontend
- **React 18** & **TypeScript**
- **Vite**
- **Tailwind CSS** & **ShadCN/UI**
- **Feature-Sliced Design (FSD)**: Scalable frontend architecture.

## Architecture

### Multi-Tenancy
Data is separated using a `tenant_id` column on all major entities. The backend uses AOP to automatically inject this filter into JPA queries based on the `X-Tenant-ID` header.

### Sport Strategies
The `SportRulesStrategy` interface allows defining custom logic for each sport (points, roster validation, etc.) without modifying core code.

## Getting Started

### Prerequisites
- JDK 21
- Node.js 18+
- Maven 3.9+

### Backend Setup
```bash
cd backend
mvn install
mvn spring-boot:run
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Initial Roadmap
- [x] Multi-tenant Core
- [x] Sport Strategy Pattern (Soccer)
- [x] Team & Player Management
- [x] Match Scheduler Foundation
- [ ] Automated Standings Calculation
- [ ] Referee Match Reporting
- [ ] Financial Module (Payments)
