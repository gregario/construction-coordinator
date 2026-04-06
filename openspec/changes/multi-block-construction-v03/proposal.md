## Why

The app currently models a single flat project with generic stages and tasks. Real Irish residential construction involves multiple blocks/buildings (main house, garage, shed, basement), each with their own construction scheme following standard industry categories. An active owner-builder using the app has provided detailed feedback: the data model doesn't match how builds actually work, the terminology is wrong ("tasks" should be "substages"), the setup flow assumes a monolithic template instead of composable method picks, and several views (Stages tab, Settings) are placeholders. Without these changes, the app can't be used to manage a real multi-block build.

## What Changes

- **BREAKING**: Introduce a `blocks` layer between projects and stages. Projects contain blocks (buildings), blocks contain construction scheme stages, stages contain substages (formerly "tasks").
- **BREAKING**: Replace monolithic templates with composable per-category method selection (pick your structure type, foundation type, envelope type independently).
- Rename "tasks" to "substages" throughout all UI copy and navigation.
- Add block sequencing — users choose whether each stage category runs in parallel across all blocks or sequentially in a chosen order.
- Build out the Stages tab with real stage/substage browsing and inline editing (currently a placeholder).
- Move stage navigation above the Gantt chart on the Schedule page.
- Implement project details and account sections in Settings (currently placeholders).
- Add building control photo tagging (photos as inspector evidence, not just progress).
- Fix procurement flow to match real workflow: quote → order → delivery with supplier tracking.
- Add snag list feature: defects for subcontractors with trade association, photo evidence, status tracking, and priority.

## Capabilities

### New Capabilities
- `block-management`: Multi-block/building support — create, edit, delete blocks with name, attached/detached flag, and storeys. Blocks own their construction scheme stages.
- `composable-templates`: Per-category method selection (Structure, Foundation, Envelope) with Irish construction method options. Replaces monolithic template picker.
- `block-sequencing`: Per-stage-category scheduling strategy — parallel across all blocks or sequential in user-defined block order.
- `snag-list`: Defect tracking for subcontractors — snag entity with trade association, photo evidence, status workflow (open → in-progress → resolved), priority levels.
- `building-control-photos`: Photo tagging for building control inspections — categorize photos by inspection stage, building control labels.
- `procurement-workflow`: Proper procurement flow replacing basic material status — quote → order → delivery tracking with supplier management.

### Modified Capabilities
- `stage-substage-view`: The Stages tab needs to be built from placeholder to real stage/substage browsing with inline editing. Stage navigation moves above Gantt. Back-navigation from substage editing works correctly.
- `settings-panels`: Project details editing (name, location, building type) and account section (profile, email) implemented from placeholder state.
- `terminology-rename`: All UI references to "tasks" become "substages" throughout the app.

## Impact

- **Database**: New `blocks` table, `block_id` FK on `stages`, new `snags` table, schema changes to `materials` for procurement states, new `photo_tags` or tag column on photos.
- **Templates migration**: Existing 3 monolithic templates replaced with composable method options seeded per category.
- **Setup flow**: Complete rework of `/setup` — block creation step added before construction scheme selection.
- **Schedule page**: Layout change (stage nav above Gantt), queries updated to scope by block.
- **Stages page**: Full rebuild from placeholder.
- **Settings page**: Two sections built from placeholder.
- **Cascade engine**: Must account for block-level sequencing constraints.
- **All UI copy**: "task" → "substage" rename across components, actions, and navigation.
- **Existing data**: Migration needed for any existing projects (add default single block, reparent stages).
