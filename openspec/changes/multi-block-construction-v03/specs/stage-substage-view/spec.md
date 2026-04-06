## ADDED Requirements

### Requirement: Stages page shows real data
The /stages page SHALL display all stages grouped by block, with expandable substage lists, replacing the current placeholder skeleton.

#### Scenario: View stages grouped by block
- **WHEN** user navigates to /stages
- **THEN** stages are displayed grouped by block (e.g., "Main House: Foundation, Framing, ..."; "Garage: Foundation, Framing, ...")

#### Scenario: Expand stage to see substages
- **WHEN** user expands a stage
- **THEN** all substages within that stage are shown with their status, dates, and assigned trade

#### Scenario: Inline edit substage
- **WHEN** user clicks to edit a substage from the stages view
- **THEN** the substage name, dates, and trade can be edited inline without navigating away

### Requirement: Stage navigation above Gantt
On the /schedule page, stage category navigation SHALL appear above the Gantt chart, not below it.

#### Scenario: Schedule page layout
- **WHEN** user views /schedule
- **THEN** stage category tabs/filters appear above the Gantt chart
- **AND** the StageManager (block/stage list) is accessible from a tab or sidebar, not below the Gantt

### Requirement: Back navigation from substage editing
Navigating back from a substage edit view SHALL return to the stages view with the correct stage expanded.

#### Scenario: Return to stages after editing substage
- **WHEN** user edits a substage via /stages/[id] and navigates back
- **THEN** the stages page loads with the parent stage expanded and scrolled into view
