## ADDED Requirements

### Requirement: Extended procurement status
Materials SHALL follow a 5-state procurement workflow: not_quoted → quoted → ordered → in_transit → delivered.

#### Scenario: Request quote
- **WHEN** user moves a material from "not quoted" to "quoted"
- **THEN** the system records the quoted_price and quoted_at timestamp

#### Scenario: Place order
- **WHEN** user moves a material from "quoted" to "ordered"
- **THEN** the system records the ordered_at timestamp and optional tracking reference

#### Scenario: Mark in transit
- **WHEN** user moves a material from "ordered" to "in transit"
- **THEN** the status updates (delivery is on its way)

#### Scenario: Mark delivered
- **WHEN** user moves a material to "delivered"
- **THEN** the system records the delivered_at timestamp

### Requirement: Procurement tracking fields
Each material SHALL have additional procurement fields: quoted_price, quoted_at, ordered_at, delivered_at, and tracking_reference.

#### Scenario: View procurement timeline
- **WHEN** user views a material's detail
- **THEN** the procurement timeline shows each status change with its timestamp

### Requirement: Migrate existing material statuses
Existing materials with status "not_ordered" SHALL be migrated to "not_quoted". Existing "ordered" stays as "ordered". Existing "delivered" stays as "delivered".

#### Scenario: Migration preserves existing data
- **WHEN** the database migration runs
- **THEN** materials with status "not_ordered" become "not_quoted"
- **AND** all other fields are preserved

### Requirement: Procurement dashboard on materials page
The materials page SHALL show procurement status counts and highlight overdue orders.

#### Scenario: View procurement summary
- **WHEN** user views the materials page
- **THEN** a summary bar shows counts per status (e.g., "3 not quoted, 5 quoted, 2 ordered, 1 in transit, 8 delivered")

#### Scenario: Overdue order warning
- **WHEN** a material's order_by_date has passed and status is still "not_quoted" or "quoted"
- **THEN** the material is flagged as overdue with a visual warning
