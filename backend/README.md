# Tennis Tournament Management System

## Overview

A web application that allows tournament organizers to manage tennis tournaments from player registration through championship matches.

The system allows players to register for tournaments, view schedules, check brackets, see rankings, and track match history.

Organizers can create tournaments, generate brackets, schedule courts, record scores, and manage players.

## Goals

- Reduce manual tournament organization
- Provide live tournament information
- Automate bracket generation
- Improve tournament scheduling

## Core Features
Players
- Register
- Login
- View tournaments
- Register for tournament
- View bracket
- View match schedule
- View profile
- Match history

Organizers
- Create tournament
- Edit tournament
- Delete tournament
- Approve registrations
- Generate bracket
- Record scores
- Assign courts
- Update schedule

Role	Permissions
Guest	Browse tournaments
Player	Register, join tournaments
Organizer	Manage tournaments
Admin	Manage everything

# System Architecture

The Tennis Tournament Management System follows a three-tier architecture consisting of a React frontend, a Spring Boot backend, and a PostgreSQL database. The frontend communicates with the backend through REST APIs, while the backend handles authentication, business logic, and database operations.

```text
                        Users
                          │
          ┌───────────────┼────────────────┐
          │               │                │
       Player        Organizer         Admin
                          │
                          ▼
                  React Frontend
        (TypeScript • Tailwind • React Router)
                          │
                    Axios (REST API)
                          │
─────────────────────────────────────────────────
                  Spring Boot Backend
─────────────────────────────────────────────────
                          │
                  Spring Security
                          │
                JWT Authentication
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
 Tournament Service  Player Service  Match Service
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    JPA Repositories
                          │
                    PostgreSQL Database
                          │
        ┌──────────┬───────────┬───────────┐
        │          │           │           │
      Users   Tournaments   Matches   Registrations
```


Architecture Layers
    Frontend
    Built with React, TypeScript, and Tailwind CSS
    Provides a responsive interface for players, organizers, and administrators
    Sends HTTP requests to the backend using Axios
Backend
    Built with Express.js
    Implements REST APIs
    Handles authentication, authorization, tournament logic, scheduling, and score management
Database
    PostgreSQL stores application data
    Spring Data JPA manages database access
    Uses relational tables for users, tournaments, matches, registrations, and player statistics


Flow of Data:
Player clicks "Register"

        │
        ▼
React Component
        │
        ▼
Axios POST /api/tournaments/1/register
        │
        ▼
TournamentController
        │
        ▼
TournamentService
        │
        ▼
RegistrationRepository
        │
        ▼
PostgreSQL
        │
        ▼
Success Response
        │
        ▼
React updates the UI