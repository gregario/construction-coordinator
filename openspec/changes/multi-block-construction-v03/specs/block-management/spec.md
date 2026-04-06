## ADDED Requirements

### Requirement: Project contains blocks
A project SHALL contain one or more blocks (buildings). Each block represents a physical structure on the site (e.g., main house, garage, shed, basement extension).

#### Scenario: Create a block
- **WHEN** user adds a block to their project
- **THEN** the system creates a block with name, attached/detached flag, and number of storeys
- **AND** the block is associated with the current project

#### Scenario: Default block for new projects
- **WHEN** a new project is created
- **THEN** the system creates one default block named "Main Building" with attached=true and storeys=2

### Requirement: Block properties
Each block SHALL have: name (text), attachment type (attached or detached), and number of storeys (integer, minimum 1).

#### Scenario: Edit block properties
- **WHEN** user edits a block's name, attachment type, or storeys
- **THEN** the changes are saved and reflected across all views

#### Scenario: Delete a block
- **WHEN** user deletes a block
- **THEN** the block and all its stages, substages, materials, and dependencies are removed
- **AND** the user is warned before deletion that this is destructive

### Requirement: Blocks own stages
Each stage SHALL belong to exactly one block. The data model hierarchy is: project → blocks → stages → substages (tasks) → materials.

#### Scenario: Stages scoped to block
- **WHEN** user views stages for a block
- **THEN** only stages belonging to that block are shown

#### Scenario: Existing data migration
- **WHEN** the migration runs on a project that predates blocks
- **THEN** a default block is created and all existing stages are assigned to it
