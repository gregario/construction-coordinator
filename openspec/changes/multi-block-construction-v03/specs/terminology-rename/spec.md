## ADDED Requirements

### Requirement: UI terminology uses substages
All user-facing text SHALL use "substage" and "substages" instead of "task" and "tasks" when referring to work items within a stage.

#### Scenario: Navigation labels
- **WHEN** user views the app navigation
- **THEN** any references to "Tasks" are replaced with "Substages"

#### Scenario: Stage detail view
- **WHEN** user views a stage's detail page
- **THEN** the substage list header reads "Substages" not "Tasks"
- **AND** add buttons read "Add Substage" not "Add Task"

#### Scenario: Gantt chart labels
- **WHEN** user views the Gantt chart and clicks a bar
- **THEN** the detail panel uses "substage" terminology

#### Scenario: Daily briefing
- **WHEN** user views the daily briefing
- **THEN** today's items are labelled "Today's Substages" not "Today's Tasks"

### Requirement: Database table names unchanged
The database table `tasks` SHALL NOT be renamed. Only user-facing UI text changes. This avoids migration risk while achieving the correct terminology for users.

#### Scenario: API and database consistency
- **WHEN** server actions reference the tasks table
- **THEN** the database queries use `tasks` table name
- **AND** only the UI display labels use "substage"
