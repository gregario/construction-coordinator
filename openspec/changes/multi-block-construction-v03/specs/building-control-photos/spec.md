## ADDED Requirements

### Requirement: Photo tagging
Each photo SHALL have a tag indicating its purpose: building_control, progress, snag, or general.

#### Scenario: Tag photo as building control
- **WHEN** user uploads a photo and selects "Building Control" tag
- **THEN** the photo is saved with tag="building_control"

#### Scenario: Default tag is general
- **WHEN** user uploads a photo without selecting a tag
- **THEN** the photo defaults to tag="general"

### Requirement: Building control inspection stage
Photos tagged as building_control SHALL have an optional inspection stage label indicating which inspection they're evidence for.

#### Scenario: Set inspection stage
- **WHEN** user tags a photo as building control and selects "Foundation Inspection"
- **THEN** the photo is saved with inspection_stage="foundation_inspection"

#### Scenario: Available inspection stages
- **WHEN** user selects a building control inspection stage
- **THEN** the options include: foundation_inspection, pre_plaster, structural, insulation_airtightness, completion, other

### Requirement: Building control photo gallery
The photos view SHALL support filtering by tag, with a dedicated "Building Control" filter that groups photos by inspection stage.

#### Scenario: Filter photos by building control
- **WHEN** user selects the "Building Control" filter on the photos page
- **THEN** only building_control tagged photos are shown, grouped by inspection stage

#### Scenario: Export building control photos
- **WHEN** user exports project data
- **THEN** building control photos are included with their inspection stage labels in the export metadata
