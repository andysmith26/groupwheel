# Groupwheel Data Model

Entity-relationship diagram showing all domain entities and their relationships.

```mermaid
erDiagram
    %% ============================================
    %% CORE ENTITIES
    %% ============================================

    Staff {
        string id PK
        string name
        StaffRole[] roles
    }

    Student {
        string id PK
        string firstName
        string lastName
        string gradeLevel
        string gender
        json meta
    }

    Pool {
        string id PK
        string name
        PoolType type "SCHOOL|GRADE|CLASS|TRIP|CUSTOM"
        string[] memberIds FK "refs Student.id"
        PoolStatus status "ACTIVE|ARCHIVED"
        PoolSource source "IMPORT|MANUAL"
        string primaryStaffOwnerId FK
        string[] ownerStaffIds FK
        json timeSpan
        string parentPoolId FK
        string userId "multi-tenant isolation"
    }

    Program {
        string id PK
        string name
        ProgramType type "CLUBS|ADVISORY|CABINS|CLASS_ACTIVITY|OTHER"
        json timeSpan "start/end or termLabel"
        string[] poolIds FK "refs Pool.id"
        string primaryPoolId FK
        string[] ownerStaffIds FK
        json sourceSheet "SheetReference"
        string userId "multi-tenant isolation"
    }

    Scenario {
        string id PK
        string programId FK
        ScenarioStatus status "DRAFT|ADOPTED|ARCHIVED"
        Group[] groups "embedded"
        string[] participantSnapshot "Student IDs at creation"
        datetime createdAt
        datetime lastModifiedAt
        string createdByStaffId FK
        json algorithmConfig
    }

    Group {
        string id PK
        string name
        number capacity "null = unlimited"
        string[] memberIds FK "refs Student.id"
        string leaderStaffId FK
    }

    %% ============================================
    %% TEMPLATES
    %% ============================================

    GroupTemplate {
        string id PK
        string ownerStaffId FK
        string name
        string description
        TemplateGroup[] groups "embedded"
        datetime createdAt
        datetime updatedAt
        string userId "multi-tenant isolation"
    }

    TemplateGroup {
        string id PK
        string name
        number capacity "null = unlimited"
    }

    %% ============================================
    %% PREFERENCES
    %% ============================================

    Preference {
        string id PK
        string programId FK
        string studentId FK
        json payload "StudentPreference"
    }

    StudentPreference {
        string studentId FK
        string[] avoidStudentIds FK
        string[] likeGroupIds FK "ranked choices"
        string[] avoidGroupIds FK
        json meta "optional flags"
    }

    %% ============================================
    %% PLACEMENT TRACKING
    %% ============================================

    Placement {
        string id PK
        string sessionId FK
        string studentId FK
        string groupId FK
        string groupName "snapshot"
        number preferenceRank "1=1st choice, null=no pref"
        string[] preferenceSnapshot "group IDs at assignment"
        datetime assignedAt
        string assignedByStaffId FK
        datetime startDate
        datetime endDate "null = active"
        PlacementType type "INITIAL|TRANSFER|CORRECTION"
        string correctsPlacementId FK
        string reason
    }

    %% ============================================
    %% GOOGLE SHEETS INTEGRATION
    %% ============================================

    SheetConnection {
        string spreadsheetId PK
        string url
        string title
        SheetTab[] tabs "embedded"
        number fetchedAt "epoch ms"
    }

    SheetTab {
        string gid PK
        string title
        number index
    }

    SheetReference {
        string spreadsheetId
        string url
    }

    %% ============================================
    %% RELATIONSHIPS
    %% ============================================

    %% Staff relationships
    Staff ||--o{ Pool : "owns (primaryStaffOwnerId)"
    Staff ||--o{ Program : "owns (ownerStaffIds)"
    Staff ||--o{ GroupTemplate : "owns"
    Staff ||--o{ Group : "leads (leaderStaffId)"
    Staff ||--o{ Scenario : "creates"
    Staff ||--o{ Placement : "assigns"

    %% Pool relationships
    Pool ||--o{ Student : "contains (memberIds)"
    Pool ||--o| Pool : "child of (parentPoolId)"

    %% Program relationships
    Program ||--|{ Pool : "references (poolIds)"
    Program ||--o{ Scenario : "contains"
    Program ||--o{ Preference : "scopes"
    Program ||--o| SheetReference : "sourced from"

    %% Scenario relationships
    Scenario ||--|{ Group : "contains (embedded)"
    Scenario }|--|| Program : "belongs to"

    %% Group relationships
    Group ||--o{ Student : "contains (memberIds)"

    %% Template relationships
    GroupTemplate ||--|{ TemplateGroup : "defines (embedded)"

    %% Preference relationships
    Preference ||--|| StudentPreference : "contains (payload)"
    Preference }o--|| Program : "scoped to"
    Preference }o--|| Student : "expressed by"
    StudentPreference ||--o{ Group : "likes (likeGroupIds)"
    StudentPreference ||--o{ Group : "avoids (avoidGroupIds)"
    StudentPreference ||--o{ Student : "avoids (avoidStudentIds)"

    %% Placement relationships
    Placement }o--|| Student : "assigns"
    Placement }o--|| Group : "to"
    Placement ||--o| Placement : "corrects"

    %% Sheet relationships
    SheetConnection ||--|{ SheetTab : "contains"
    SheetConnection ||--|| SheetReference : "persisted as"
```

## Legend

| Symbol | Meaning |
|--------|---------|
| `PK` | Primary Key |
| `FK` | Foreign Key reference |
| `\|\|--\|{` | one-to-many (required) |
| `\|\|--o{` | one-to-many (optional) |
| `}o--\|\|` | many-to-one (optional on many side) |

## Notes

- **Embedded arrays** (like `Group[]` in Scenario) are stored directly within the parent entity, not as separate tables
- **Multi-tenancy**: Major entities include `userId?: string` for data isolation when users authenticate via Google OAuth
- **Snapshots**: Scenario stores `participantSnapshot` and Placement stores `preferenceSnapshot` for historical accuracy
- Source code: `src/lib/domain/`
