-- ============================================================
-- TEMPLATES
-- Publicly readable residential construction templates.
-- Seeded once at schema creation. No per-user ownership.
-- Templates have a JSONB stages blob containing default tasks
-- and materials — copied into a project when the user picks a template.
-- ============================================================

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  total_duration_days INTEGER,
  stages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Publicly readable to all authenticated users
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates: authenticated read"
  ON templates FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- SEED: Three residential construction templates (Ireland)
-- ============================================================

INSERT INTO templates (name, description, total_duration_days, stages) VALUES (
  'Standard Timber Frame',
  'Two-storey timber frame residential build. Typical Irish new-build schedule.',
  365,
  '[
    {
      "name": "Site Preparation & Foundations",
      "color": "#8B5E3C",
      "order_index": 0,
      "tasks": [
        {"name": "Site survey & set-out", "duration_days": 3, "notes": "Engage surveyor to peg out foundations"},
        {"name": "Topsoil strip & spoil removal", "duration_days": 5},
        {"name": "Foundation excavation", "duration_days": 4},
        {"name": "Hardcore fill & compaction", "duration_days": 3},
        {"name": "Radon barrier & insulation", "duration_days": 2},
        {"name": "Pour slab / strip footings", "duration_days": 2, "materials": [
          {"name": "Ready-mix concrete", "quantity": "60m³", "lead_time_days": 3, "supplier_name": "Kilsaran Concrete"}
        ]}
      ]
    },
    {
      "name": "Timber Frame Erection",
      "color": "#6B8F3F",
      "order_index": 1,
      "tasks": [
        {"name": "Sole plate installation", "duration_days": 2},
        {"name": "Timber frame panels delivered & erected", "duration_days": 5, "materials": [
          {"name": "Timber frame kit", "quantity": "1 kit", "lead_time_days": 42, "supplier_name": "Kingspan Century"}
        ]},
        {"name": "Roof trusses delivered & fixed", "duration_days": 3, "materials": [
          {"name": "Roof trusses", "quantity": "24 trusses", "lead_time_days": 28}
        ]},
        {"name": "Roof sarking & felt", "duration_days": 3},
        {"name": "Ridge tiles & flashings", "duration_days": 2}
      ]
    },
    {
      "name": "External Envelope",
      "color": "#C17F3A",
      "order_index": 2,
      "tasks": [
        {"name": "Windows & external doors fitted", "duration_days": 5, "materials": [
          {"name": "Triple-glazed windows & doors", "quantity": "14 units", "lead_time_days": 56, "supplier_name": "Munster Joinery"}
        ]},
        {"name": "External render / brick slip", "duration_days": 10},
        {"name": "Roof slating", "duration_days": 8, "materials": [
          {"name": "Natural slate", "quantity": "900 tiles", "lead_time_days": 21}
        ]},
        {"name": "Gutters & downpipes", "duration_days": 2}
      ]
    },
    {
      "name": "First Fix MEP",
      "color": "#4A7FA5",
      "order_index": 3,
      "tasks": [
        {"name": "First fix plumbing", "duration_days": 8},
        {"name": "First fix electrical", "duration_days": 7},
        {"name": "MVHR installation", "duration_days": 5, "materials": [
          {"name": "MVHR unit", "quantity": "1 unit", "lead_time_days": 21, "supplier_name": "Paul Heat Recovery"}
        ]},
        {"name": "Underfloor heating pipes", "duration_days": 4}
      ]
    },
    {
      "name": "Insulation & Airtightness",
      "color": "#7B6FA5",
      "order_index": 4,
      "tasks": [
        {"name": "Internal insulation (walls & roof)", "duration_days": 5},
        {"name": "Airtightness membrane & tape", "duration_days": 4},
        {"name": "Blower door test", "duration_days": 1, "notes": "Target: ≤ 1.0 ACH@50Pa for A-rating"}
      ]
    },
    {
      "name": "Plastering & Second Fix",
      "color": "#A56B4A",
      "order_index": 5,
      "tasks": [
        {"name": "Plasterboard & skim", "duration_days": 14, "materials": [
          {"name": "Plasterboard 12.5mm", "quantity": "280 sheets", "lead_time_days": 5}
        ]},
        {"name": "Second fix plumbing", "duration_days": 5},
        {"name": "Second fix electrical", "duration_days": 6},
        {"name": "Sanitary ware installation", "duration_days": 3, "materials": [
          {"name": "Bathroom suite", "quantity": "2 sets", "lead_time_days": 28}
        ]}
      ]
    },
    {
      "name": "Finishing",
      "color": "#5A9A7A",
      "order_index": 6,
      "tasks": [
        {"name": "Internal doors & skirting", "duration_days": 5},
        {"name": "Kitchen fitting", "duration_days": 7, "materials": [
          {"name": "Kitchen units & worktop", "quantity": "1 kitchen", "lead_time_days": 56}
        ]},
        {"name": "Painting & decorating", "duration_days": 10},
        {"name": "Floor coverings", "duration_days": 5},
        {"name": "Snag list & rectification", "duration_days": 7}
      ]
    }
  ]'
),
(
  'Slab-on-Grade Single Storey',
  'Single-storey bungalow on insulated concrete raft. Simpler build for smaller sites.',
  280,
  '[
    {
      "name": "Foundations & Slab",
      "color": "#8B5E3C",
      "order_index": 0,
      "tasks": [
        {"name": "Site clearance & set-out", "duration_days": 3},
        {"name": "ICF raft insulation", "duration_days": 4, "materials": [
          {"name": "ICF raft panels", "quantity": "220m²", "lead_time_days": 14}
        ]},
        {"name": "Pour slab", "duration_days": 2}
      ]
    },
    {
      "name": "Structure & Roof",
      "color": "#6B8F3F",
      "order_index": 1,
      "tasks": [
        {"name": "Blockwork walls", "duration_days": 12},
        {"name": "Roof trusses & felting", "duration_days": 5}
      ]
    },
    {
      "name": "Envelope & First Fix",
      "color": "#C17F3A",
      "order_index": 2,
      "tasks": [
        {"name": "Windows & doors", "duration_days": 4, "materials": [
          {"name": "Windows & doors", "quantity": "10 units", "lead_time_days": 42}
        ]},
        {"name": "First fix plumbing & electrical", "duration_days": 10}
      ]
    },
    {
      "name": "Finish",
      "color": "#4A7FA5",
      "order_index": 3,
      "tasks": [
        {"name": "Plaster & second fix", "duration_days": 14},
        {"name": "Kitchen & bathrooms", "duration_days": 8},
        {"name": "Painting & floor coverings", "duration_days": 10}
      ]
    }
  ]'
),
(
  'ICF Two-Storey',
  'Insulated Concrete Form construction. Excellent airtightness and thermal performance.',
  390,
  '[
    {
      "name": "Foundations",
      "color": "#8B5E3C",
      "order_index": 0,
      "tasks": [
        {"name": "Foundation engineering & survey", "duration_days": 5},
        {"name": "Strip footings or raft pour", "duration_days": 4}
      ]
    },
    {
      "name": "ICF Walls",
      "color": "#6B8F3F",
      "order_index": 1,
      "tasks": [
        {"name": "ICF block delivery", "duration_days": 1, "materials": [
          {"name": "ICF blocks", "quantity": "180 blocks", "lead_time_days": 14, "supplier_name": "Nudura Ireland"}
        ]},
        {"name": "Ground floor ICF pour", "duration_days": 5},
        {"name": "First floor ICF pour", "duration_days": 5}
      ]
    },
    {
      "name": "Roof & Envelope",
      "color": "#C17F3A",
      "order_index": 2,
      "tasks": [
        {"name": "Roof structure & covering", "duration_days": 10},
        {"name": "Triple-glazed windows & doors", "duration_days": 5, "materials": [
          {"name": "Windows & doors", "quantity": "16 units", "lead_time_days": 56}
        ]}
      ]
    },
    {
      "name": "MEP & Finish",
      "color": "#4A7FA5",
      "order_index": 3,
      "tasks": [
        {"name": "First fix trades", "duration_days": 12},
        {"name": "Insulation & airtightness tape", "duration_days": 3},
        {"name": "Blower door test", "duration_days": 1},
        {"name": "Plasterboard & skim", "duration_days": 16},
        {"name": "Second fix & sanitary ware", "duration_days": 10},
        {"name": "Kitchen fitting", "duration_days": 7},
        {"name": "Painting & floor coverings", "duration_days": 10},
        {"name": "Snag & sign-off", "duration_days": 5}
      ]
    }
  ]'
);
