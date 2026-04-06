## ADDED Requirements

### Requirement: Per-category method selection
The setup flow SHALL present construction method options per category rather than a single monolithic template. Categories are: Foundation, Structure (Framing), Doors & Windows, Envelope, 1st Fix, 2nd Fix, Finishing, External.

#### Scenario: User picks structure method
- **WHEN** user is setting up a block's construction scheme
- **THEN** the system presents method options for each category sequentially
- **AND** each category shows its available methods with descriptions

#### Scenario: Structure methods available
- **WHEN** user selects the Structure category
- **THEN** the options are: Timber Frame (Off-Site Manufacture), Timber Frame (On-Site Fabrication), Block, ICF, Light Steel Frame, Other

#### Scenario: Foundation methods available
- **WHEN** user selects the Foundation category
- **THEN** the options are: Strip with Slab, Floated Concrete Slab, Passiv Insulated Slab, Other

#### Scenario: Envelope wall methods available
- **WHEN** user selects the Envelope Walls category
- **THEN** the options are: Block & Render, Timber Cladding, External Insulation, Other

#### Scenario: Envelope roof methods available
- **WHEN** user selects the Envelope Roof category
- **THEN** the options are: Slate, Steel Sheet, Other

### Requirement: Method selection generates substages
When a user picks a method for a category, the system SHALL populate the corresponding stage with default substages appropriate to that method.

#### Scenario: Timber frame off-site generates substages
- **WHEN** user picks "Timber Frame — Off-Site Manufacture" for Structure
- **THEN** the Framing stage is populated with substages including: Frame kit delivery, Panel erection, Roof trusses, Roof sarking & felt, Ridge tiles & flashings

#### Scenario: Foundation category substages
- **WHEN** user picks any Foundation method
- **THEN** the Foundation stage includes substages: Marking Out, Excavation & Shuttering, Services, Steels/Membranes/Insulation, Concrete Pour (with method-specific variations)

### Requirement: Construction methods seed data
The system SHALL store construction methods in a `construction_methods` table with category, method name, optional variant, and default substages as JSONB.

#### Scenario: Seed data exists on fresh deploy
- **WHEN** the database is migrated
- **THEN** construction method options are seeded for all categories with Irish construction defaults

### Requirement: Copy scheme to other blocks
After setting up the first block's construction scheme, the user SHALL be offered the option to apply the same choices to other blocks or edit individually.

#### Scenario: Apply same scheme
- **WHEN** user finishes Block 1 setup and clicks "Apply same to Block 2"
- **THEN** Block 2 receives the same method selections and generated substages

#### Scenario: Edit scheme for another block
- **WHEN** user finishes Block 1 setup and clicks "Edit for Block 2"
- **THEN** the method picker opens for Block 2 with Block 1's choices as defaults
