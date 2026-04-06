## ADDED Requirements

### Requirement: Per-category scheduling mode
For each stage category, the user SHALL choose whether work runs in parallel across all blocks or sequentially through blocks in a chosen order.

#### Scenario: Set parallel mode
- **WHEN** user sets Foundation to "parallel"
- **THEN** foundation work for all blocks can be scheduled to overlap or run simultaneously

#### Scenario: Set sequential mode with order
- **WHEN** user sets Framing to "sequential" and orders blocks as Garage → Block A → Block C
- **THEN** the scheduling engine ensures Garage framing completes before Block A framing starts, and Block A completes before Block C starts

### Requirement: Scheduling config stored on project
The scheduling configuration SHALL be stored as a JSONB column on the projects table, mapping each stage category to its mode and optional block order.

#### Scenario: Default scheduling config
- **WHEN** a project has no scheduling config set
- **THEN** all categories default to "sequential" in the order blocks were created

#### Scenario: Edit scheduling config
- **WHEN** user changes a category from sequential to parallel
- **THEN** the config is updated and the cascade engine recalculates affected dates

### Requirement: Cascade engine respects block sequencing
The cascade scheduling engine SHALL enforce block sequencing constraints when recalculating dates.

#### Scenario: Sequential delay cascades across blocks
- **WHEN** Framing is sequential (Garage → Block A) and Garage framing is delayed by 5 days
- **THEN** Block A framing start date shifts by 5 days
- **AND** all downstream substages within Block A are also shifted

#### Scenario: Parallel mode allows overlap
- **WHEN** Foundation is parallel across all blocks
- **THEN** delaying one block's foundation does NOT shift other blocks' foundation dates
