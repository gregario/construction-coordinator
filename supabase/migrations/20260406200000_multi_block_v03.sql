-- ============================================================
-- Multi-Block Construction v0.3.0 Migration
-- ============================================================
-- Adds: blocks, construction_methods, snags tables
-- Modifies: stages (block_id), photos (snag_id, tag, inspection_stage),
--           materials (procurement fields), projects (scheduling_config)
-- ============================================================

-- ============================================================
-- 1. BLOCKS TABLE
-- ============================================================

CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  attachment_type TEXT NOT NULL DEFAULT 'attached' CHECK (attachment_type IN ('attached', 'detached')),
  storeys INTEGER NOT NULL DEFAULT 2 CHECK (storeys >= 1 AND storeys <= 10),
  construction_scheme JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blocks_project_id ON blocks(project_id);
CREATE INDEX idx_blocks_order ON blocks(project_id, order_index);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks: owner select" ON blocks FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = blocks.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "blocks: owner insert" ON blocks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = blocks.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "blocks: owner update" ON blocks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = blocks.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "blocks: owner delete" ON blocks FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = blocks.project_id AND projects.user_id = auth.uid())
);

CREATE TRIGGER trg_blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. ADD block_id TO STAGES (nullable for backward compat)
-- ============================================================

ALTER TABLE stages ADD COLUMN block_id UUID REFERENCES blocks(id) ON DELETE CASCADE;
CREATE INDEX idx_stages_block_id ON stages(block_id);

-- ============================================================
-- 3. ADD scheduling_config TO PROJECTS
-- ============================================================

ALTER TABLE projects ADD COLUMN scheduling_config JSONB NOT NULL DEFAULT '{}';

-- ============================================================
-- 4. SNAGS TABLE
-- ============================================================

CREATE TABLE snags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
  trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_snags_project_id ON snags(project_id);
CREATE INDEX idx_snags_status ON snags(project_id, status);
CREATE INDEX idx_snags_trade ON snags(trade_id);
CREATE INDEX idx_snags_block ON snags(block_id);

ALTER TABLE snags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snags: owner select" ON snags FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = snags.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "snags: owner insert" ON snags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = snags.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "snags: owner update" ON snags FOR UPDATE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = snags.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "snags: owner delete" ON snags FOR DELETE USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = snags.project_id AND projects.user_id = auth.uid())
);

CREATE TRIGGER trg_snags_updated_at
  BEFORE UPDATE ON snags
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. PHOTO ENHANCEMENTS — snag_id, tag, inspection_stage
-- ============================================================

ALTER TABLE photos ADD COLUMN snag_id UUID REFERENCES snags(id) ON DELETE CASCADE;
ALTER TABLE photos ADD COLUMN tag TEXT NOT NULL DEFAULT 'general' CHECK (tag IN ('building_control', 'progress', 'snag', 'general'));
ALTER TABLE photos ADD COLUMN inspection_stage TEXT CHECK (
  inspection_stage IS NULL OR inspection_stage IN (
    'foundation_inspection', 'pre_plaster', 'structural',
    'insulation_airtightness', 'completion', 'other'
  )
);

CREATE INDEX idx_photos_snag ON photos(snag_id);
CREATE INDEX idx_photos_tag ON photos(project_id, tag);

-- ============================================================
-- 6. PROCUREMENT ENHANCEMENTS ON MATERIALS
-- ============================================================

ALTER TABLE materials ADD COLUMN quoted_price NUMERIC(10,2);
ALTER TABLE materials ADD COLUMN quoted_at TIMESTAMPTZ;
ALTER TABLE materials ADD COLUMN ordered_at TIMESTAMPTZ;
ALTER TABLE materials ADD COLUMN delivered_at TIMESTAMPTZ;
ALTER TABLE materials ADD COLUMN tracking_reference TEXT;

-- Migrate existing data BEFORE changing the constraint.
-- Postgres requires dropping and recreating CHECK constraints.
ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_order_status_check;

-- Migrate existing data: not_ordered → not_quoted
UPDATE materials SET order_status = 'not_quoted' WHERE order_status = 'not_ordered';

-- Now apply the new constraint (all rows should be valid)
ALTER TABLE materials ADD CONSTRAINT materials_order_status_check
  CHECK (order_status IN ('not_quoted', 'quoted', 'ordered', 'in_transit', 'delivered'));

-- ============================================================
-- 7. CONSTRUCTION METHODS TABLE (composable templates)
-- ============================================================

CREATE TABLE construction_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'foundation', 'structure', 'doors_windows', 'envelope_walls',
    'envelope_roof', 'first_fix', 'second_fix', 'finishing', 'external'
  )),
  method_name TEXT NOT NULL,
  variant TEXT,
  description TEXT,
  substages JSONB NOT NULL DEFAULT '[]',
  default_duration_days INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_construction_methods_category ON construction_methods(category, display_order);

-- Publicly readable to all authenticated users (same as templates)
ALTER TABLE construction_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "construction_methods: authenticated read"
  ON construction_methods FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 8. SEED: Construction Methods
-- ============================================================

-- FOUNDATION methods
INSERT INTO construction_methods (category, method_name, description, substages, default_duration_days, display_order) VALUES
('foundation', 'Strip with Slab', 'Traditional strip footings with poured concrete slab', '[
  {"name": "Marking Out", "duration_days": 2},
  {"name": "Excavation & Shuttering", "duration_days": 5},
  {"name": "Services (drainage, ducts)", "duration_days": 3},
  {"name": "Steels, Membranes & Insulation", "duration_days": 3},
  {"name": "Concrete Pour", "duration_days": 2, "materials": [{"name": "Ready-mix concrete", "quantity": "60m³", "lead_time_days": 3}]}
]', 15, 0),
('foundation', 'Floated Concrete Slab', 'Insulated concrete raft foundation on grade', '[
  {"name": "Marking Out", "duration_days": 2},
  {"name": "Excavation & Shuttering", "duration_days": 4},
  {"name": "Services (drainage, ducts)", "duration_days": 3},
  {"name": "Steels, Membranes & Insulation", "duration_days": 4, "materials": [{"name": "ICF raft panels", "quantity": "220m²", "lead_time_days": 14}]},
  {"name": "Concrete Pour", "duration_days": 2, "materials": [{"name": "Ready-mix concrete", "quantity": "45m³", "lead_time_days": 3}]}
]', 15, 1),
('foundation', 'Passiv Insulated Slab', 'High-performance insulated slab for passive house standard', '[
  {"name": "Marking Out", "duration_days": 2},
  {"name": "Excavation & Shuttering", "duration_days": 5},
  {"name": "Services (drainage, ducts)", "duration_days": 3},
  {"name": "Steels, Membranes & Insulation", "duration_days": 5, "materials": [{"name": "Passive slab insulation system", "quantity": "1 kit", "lead_time_days": 21}]},
  {"name": "Concrete Pour", "duration_days": 2, "materials": [{"name": "Ready-mix concrete", "quantity": "50m³", "lead_time_days": 3}]}
]', 17, 2),
('foundation', 'Other', 'Custom foundation type', '[
  {"name": "Marking Out", "duration_days": 2},
  {"name": "Excavation & Shuttering", "duration_days": 5},
  {"name": "Services (drainage, ducts)", "duration_days": 3},
  {"name": "Steels, Membranes & Insulation", "duration_days": 3},
  {"name": "Concrete Pour", "duration_days": 2}
]', 15, 3);

-- STRUCTURE methods
INSERT INTO construction_methods (category, method_name, variant, description, substages, default_duration_days, display_order) VALUES
('structure', 'Timber Frame', 'Off-Site Manufacture', 'Pre-manufactured timber frame panels delivered and erected on site', '[
  {"name": "Wall Panels — Delivery & Erection", "duration_days": 5, "materials": [{"name": "Timber frame kit", "quantity": "1 kit", "lead_time_days": 42, "supplier_name": ""}]},
  {"name": "Roof Trusses — Delivery & Fix", "duration_days": 3, "materials": [{"name": "Roof trusses", "quantity": "24 trusses", "lead_time_days": 28}]},
  {"name": "Membranes (breather, vapour)", "duration_days": 3}
]', 11, 0),
('structure', 'Timber Frame', 'On-Site Fabrication', 'Timber frame walls built on site from materials', '[
  {"name": "Wall Framing — On-Site Build", "duration_days": 12, "materials": [{"name": "Structural timber", "quantity": "1 lot", "lead_time_days": 14}]},
  {"name": "Roof Trusses — Delivery & Fix", "duration_days": 4, "materials": [{"name": "Roof trusses", "quantity": "24 trusses", "lead_time_days": 28}]},
  {"name": "Membranes (breather, vapour)", "duration_days": 3}
]', 19, 1),
('structure', 'Block', NULL, 'Traditional concrete block construction', '[
  {"name": "Wall — Blockwork", "duration_days": 16, "materials": [{"name": "Concrete blocks", "quantity": "1 lot", "lead_time_days": 7}]},
  {"name": "Roof Trusses — Delivery & Fix", "duration_days": 4, "materials": [{"name": "Roof trusses", "quantity": "24 trusses", "lead_time_days": 28}]},
  {"name": "Membranes", "duration_days": 2}
]', 22, 2),
('structure', 'ICF', NULL, 'Insulated Concrete Form — blocks stacked and filled with concrete', '[
  {"name": "Wall — ICF Block & Pour (Ground Floor)", "duration_days": 5, "materials": [{"name": "ICF blocks", "quantity": "180 blocks", "lead_time_days": 14}]},
  {"name": "Wall — ICF Block & Pour (First Floor)", "duration_days": 5},
  {"name": "Roof Structure", "duration_days": 4, "materials": [{"name": "Roof trusses", "quantity": "24 trusses", "lead_time_days": 28}]},
  {"name": "Membranes", "duration_days": 2}
]', 16, 3),
('structure', 'Light Steel Frame', NULL, 'Light gauge steel frame construction', '[
  {"name": "Wall — Steel Frame Erection", "duration_days": 8, "materials": [{"name": "Light steel frame kit", "quantity": "1 kit", "lead_time_days": 35}]},
  {"name": "Roof Structure", "duration_days": 4},
  {"name": "Membranes", "duration_days": 2}
]', 14, 4),
('structure', 'Other', NULL, 'Custom structure type', '[
  {"name": "Wall", "duration_days": 14},
  {"name": "Roof", "duration_days": 5},
  {"name": "Membranes", "duration_days": 2}
]', 21, 5);

-- DOORS & WINDOWS (universal — no method variants)
INSERT INTO construction_methods (category, method_name, description, substages, default_duration_days, display_order) VALUES
('doors_windows', 'Standard', 'Doors and windows procurement and installation', '[
  {"name": "Quotes", "duration_days": 5},
  {"name": "Order", "duration_days": 1, "materials": [{"name": "Windows & external doors", "quantity": "1 lot", "lead_time_days": 56}]},
  {"name": "Delivery", "duration_days": 1},
  {"name": "Installation", "duration_days": 5}
]', 12, 0);

-- ENVELOPE — WALLS
INSERT INTO construction_methods (category, method_name, description, substages, default_duration_days, display_order) VALUES
('envelope_walls', 'Block & Render', 'External render on blockwork or carrier board', '[
  {"name": "Roofing", "duration_days": 8, "materials": [{"name": "Roof covering", "quantity": "1 lot", "lead_time_days": 21}]},
  {"name": "Facades — Render System", "duration_days": 10, "materials": [{"name": "Render system", "quantity": "1 lot", "lead_time_days": 14}]}
]', 18, 0),
('envelope_walls', 'Timber Cladding', 'Timber rain-screen cladding on battens', '[
  {"name": "Roofing", "duration_days": 8, "materials": [{"name": "Roof covering", "quantity": "1 lot", "lead_time_days": 21}]},
  {"name": "Facades — Timber Cladding", "duration_days": 12, "materials": [{"name": "Timber cladding", "quantity": "1 lot", "lead_time_days": 21}]}
]', 20, 1),
('envelope_walls', 'External Insulation', 'External insulation and finish system (EIFS/ETICS)', '[
  {"name": "Roofing", "duration_days": 8, "materials": [{"name": "Roof covering", "quantity": "1 lot", "lead_time_days": 21}]},
  {"name": "Facades — External Insulation System", "duration_days": 14, "materials": [{"name": "EWI system", "quantity": "1 lot", "lead_time_days": 14}]}
]', 22, 2),
('envelope_walls', 'Other', 'Custom wall envelope', '[
  {"name": "Roofing", "duration_days": 8},
  {"name": "Facades", "duration_days": 10}
]', 18, 3);

-- ENVELOPE — ROOF
INSERT INTO construction_methods (category, method_name, description, substages, default_duration_days, display_order) VALUES
('envelope_roof', 'Slate', 'Natural or artificial slate roof covering', '[
  {"name": "Roofing — Slate", "duration_days": 8, "materials": [{"name": "Roof slates", "quantity": "900 tiles", "lead_time_days": 21}]},
  {"name": "Gutters & Downpipes", "duration_days": 2}
]', 10, 0),
('envelope_roof', 'Steel Sheet', 'Profiled steel sheet roofing', '[
  {"name": "Roofing — Steel Sheet", "duration_days": 4, "materials": [{"name": "Steel roof sheets", "quantity": "1 lot", "lead_time_days": 14}]},
  {"name": "Gutters & Downpipes", "duration_days": 2}
]', 6, 1),
('envelope_roof', 'Other', 'Custom roof covering', '[
  {"name": "Roofing", "duration_days": 8},
  {"name": "Gutters & Downpipes", "duration_days": 2}
]', 10, 2);

-- 1ST FIX (universal)
INSERT INTO construction_methods (category, method_name, description, substages, default_duration_days, display_order) VALUES
('first_fix', 'Standard', 'First fix mechanical, electrical, and building envelope completion', '[
  {"name": "Plumbing 1st Fix", "duration_days": 8},
  {"name": "Electrical 1st Fix", "duration_days": 7},
  {"name": "MVHR 1st Fix", "duration_days": 5, "materials": [{"name": "MVHR unit", "quantity": "1 unit", "lead_time_days": 21}]},
  {"name": "Insulation", "duration_days": 5},
  {"name": "Airtightness", "duration_days": 4},
  {"name": "Plasterboard", "duration_days": 14, "materials": [{"name": "Plasterboard 12.5mm", "quantity": "280 sheets", "lead_time_days": 5}]},
  {"name": "Int Doors, Window Boards & Carpentry", "duration_days": 5},
  {"name": "Skim", "duration_days": 10},
  {"name": "Decking", "duration_days": 3}
]', 61, 0);

-- 2ND FIX (universal)
INSERT INTO construction_methods (category, method_name, description, substages, default_duration_days, display_order) VALUES
('second_fix', 'Standard', 'Second fix mechanical and electrical', '[
  {"name": "Plumbing 2nd Fix", "duration_days": 5},
  {"name": "Electrical 2nd Fix", "duration_days": 6},
  {"name": "MVHR 2nd Fix", "duration_days": 3}
]', 14, 0);

-- FINISHING (universal)
INSERT INTO construction_methods (category, method_name, description, substages, default_duration_days, display_order) VALUES
('finishing', 'Standard', 'Interior finishing and handover', '[
  {"name": "Cabinetry & Kitchen", "duration_days": 7, "materials": [{"name": "Kitchen units & worktop", "quantity": "1 kitchen", "lead_time_days": 56}]},
  {"name": "Tiling", "duration_days": 5},
  {"name": "Flooring", "duration_days": 5},
  {"name": "Painting", "duration_days": 10},
  {"name": "Final Inspection", "duration_days": 2},
  {"name": "Final Approval", "duration_days": 1}
]', 30, 0);

-- EXTERNAL (user-defined, minimal defaults)
INSERT INTO construction_methods (category, method_name, description, substages, default_duration_days, display_order) VALUES
('external', 'Standard', 'External works, landscaping, and site completion', '[
  {"name": "Driveway & Paths", "duration_days": 5},
  {"name": "Landscaping", "duration_days": 5},
  {"name": "Boundary Walls & Fencing", "duration_days": 3},
  {"name": "Final Site Clearance", "duration_days": 2}
]', 15, 0);

-- ============================================================
-- 9. DATA MIGRATION — Default blocks for existing projects
-- ============================================================

-- Create a default "Main Building" block for each existing project
INSERT INTO blocks (project_id, name, attachment_type, storeys, order_index)
SELECT id, 'Main Building', 'attached', 2, 0
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM blocks WHERE blocks.project_id = projects.id
);

-- Assign all orphaned stages to their project's default block
UPDATE stages
SET block_id = (
  SELECT b.id FROM blocks b
  WHERE b.project_id = stages.project_id
  ORDER BY b.order_index ASC
  LIMIT 1
)
WHERE block_id IS NULL;
