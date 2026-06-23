# Backend Architecture and Database Strategy

## Overview

The backend is responsible for:

- managing patient data
- storing assessment results
- generating personalized exercise recommendations
- tracking session progress and feedback

The system follows a layered architecture:

- Controller (API endpoints)
- Service (business logic)
- Repository (database access)
- Model (domain entities)

---

## Technology Stack

- Java 21 (or 17)
- Spring Boot
- Spring Web
- Spring Data JPA
- PostgreSQL
- Lombok

---

## Database Strategy

The system requires a relational database to store structured healthcare-related data.

PostgreSQL was selected due to:

- strong relational modeling
- support for complex queries
- compatibility with Spring Boot

---

## Development Approach

The database will NOT be designed manually first.

Instead, the following approach is used:

1. Define domain models (Java entities)
2. Use JPA to map entities to database tables
3. Automatically generate schema during development
4. Refine structure iteratively

This approach ensures alignment between code and data model.

---

## Initial Domain Model

The following entities are required for the initial version of the system:

### Patient
Represents the person using the system.

### Assessment
Stores evaluation sessions performed by professionals.

### DomainScore
Represents scores for specific domains (e.g., balance, memory).

### Exercise
Represents an activity that can be recommended.

### Recommendation
Represents the assignment of exercises to a patient.

### SessionPlan
Represents a daily or scheduled plan of activities.

### Feedback
Represents the result of a completed exercise.

---

## Data Relationships

- A Patient has multiple Assessments
- An Assessment has multiple DomainScores
- A Patient has multiple SessionPlans
- A SessionPlan contains multiple Recommendations
- A Recommendation references one Exercise
- A Recommendation may have Feedback

---

## Recommendation Engine

The system will use a rule-based recommendation engine.

Rules include:

- prioritize low-score domains
- ensure session duration between 30–60 minutes
- include both cognitive and motor exercises
- avoid repeating completed activities
- adapt difficulty based on performance

---

## Future Considerations

- introduction of explainability layer
- clinician override support
- advanced analytics and reporting
- potential AI-based improvements