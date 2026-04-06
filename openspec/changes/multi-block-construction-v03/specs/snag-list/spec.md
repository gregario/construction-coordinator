## ADDED Requirements

### Requirement: Snag entity
The system SHALL support snag items — defects or issues noted for subcontractors to rectify. Each snag has: title, description, priority (low/medium/high/critical), status (open/in_progress/resolved), and timestamps.

#### Scenario: Create a snag
- **WHEN** user creates a snag with title, description, and priority
- **THEN** the snag is saved with status "open" and the current timestamp

#### Scenario: Assign snag to trade
- **WHEN** user assigns a snag to a trade contact
- **THEN** the snag is linked to that trade and displayed in the trade's snag list

#### Scenario: Assign snag to block and stage
- **WHEN** user creates a snag and selects a block and stage
- **THEN** the snag is associated with that block and stage for context

### Requirement: Snag status workflow
Snags SHALL follow a one-way status progression: open → in_progress → resolved.

#### Scenario: Mark snag in progress
- **WHEN** user marks an open snag as "in progress"
- **THEN** the status updates and the timestamp is recorded

#### Scenario: Resolve snag
- **WHEN** user marks a snag as "resolved"
- **THEN** the status updates, resolved_at timestamp is set, and the snag moves to the resolved list

#### Scenario: Cannot reopen resolved snag
- **WHEN** user attempts to change a resolved snag back to open
- **THEN** the system prevents this (user must create a new snag if the issue recurs)

### Requirement: Snag photo evidence
Users SHALL be able to attach photos to snags as evidence of the defect.

#### Scenario: Add photo to snag
- **WHEN** user uploads a photo on a snag
- **THEN** the photo is stored and linked to the snag via the existing photos table with snag_id

#### Scenario: View snag photos
- **WHEN** user views a snag's detail
- **THEN** all attached photos are displayed as a gallery

### Requirement: Snag list view
The app SHALL have a dedicated snag list view showing all snags grouped by status, with filters for block, stage, trade, and priority.

#### Scenario: View all snags
- **WHEN** user navigates to the snag list
- **THEN** snags are displayed grouped by status (open first, then in progress, then resolved)

#### Scenario: Filter snags by trade
- **WHEN** user filters the snag list by a specific trade
- **THEN** only snags assigned to that trade are shown
