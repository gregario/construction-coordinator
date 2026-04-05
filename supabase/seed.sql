-- ============================================================
-- Construction Coordinator — Seed Data
-- Test user: 00000000-0000-0000-0000-000000000001
-- Project: O'Brien Timber Frame House, Wicklow, starting 2026-06-01
-- ============================================================

-- ============================================================
-- PROJECT
-- ============================================================

INSERT INTO projects (id, user_id, name, address, start_date, status)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'O''Brien Timber Frame House',
  '42 Laragh Lane, Wicklow',
  '2026-06-01',
  'active'
);

-- ============================================================
-- TRADES
-- ============================================================

INSERT INTO trades (id, project_id, name, specialty, phone, email, notes)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Seán Farrell Engineering',
    'Structural Engineering',
    '+353 87 412 9901',
    'sean@farrelleng.ie',
    'PE stamped drawings required for frame inspection. Available Mon–Thu on site visits.'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Murphy Groundworks Ltd',
    'Groundworks & Foundations',
    '+353 86 234 5678',
    'info@murphygroundworks.ie',
    'Includes excavation, footings, and slab pour. 4-week mobilisation notice required.'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'Wicklow Timber Systems',
    'Timber Frame Supply & Erection',
    '+353 404 61234',
    'orders@wicklowtimber.ie',
    'Factory lead time 10 weeks. Crane erection team included in supply contract.'
  );

-- ============================================================
-- STAGES
-- ============================================================

INSERT INTO stages (id, project_id, name, color, order_index)
VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Foundation',        '#8B5E3C', 0),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Frame',             '#A0522D', 1),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Roof',              '#B87333', 2),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'External Envelope', '#C68642', 3),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Internal Works',   '#D4956A', 4),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'Services',         '#CD853F', 5),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'Finishes',         '#DEB887', 6);

-- ============================================================
-- TASKS
-- ============================================================

-- Stage 1: Foundation (starts 2026-06-01)
INSERT INTO tasks (id, project_id, stage_id, trade_id, name, duration_days, planned_start, planned_end, status, order_index, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'Site Setup & Topsoil Strip',
    5, '2026-06-01', '2026-06-05', 'not_started', 0,
    'Clear and level site, remove topsoil for reuse in landscaping. Welfare facilities setup.'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'Excavation & Footings',
    7, '2026-06-08', '2026-06-14', 'not_started', 1,
    'Excavate to founding level. Form and pour strip footings. Allow 3 days cure before backfill.'
  ),
  (
    '40000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'Block Wall & Radon Barrier',
    5, '2026-06-15', '2026-06-19', 'not_started', 2,
    'Lay rising block wall to DPC level. Install radon barrier and perimeter drain.'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    'Pour Concrete Slab',
    3, '2026-06-22', '2026-06-24', 'not_started', 3,
    'Pour C25 reinforced ground floor slab. 28-day cure before frame erection.'
  );

-- Stage 2: Frame (starts after slab cure ~2026-07-22)
INSERT INTO tasks (id, project_id, stage_id, trade_id, name, duration_days, planned_start, planned_end, status, order_index, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    'Timber Frame Delivery & Crane Erection',
    5, '2026-07-22', '2026-07-26', 'not_started', 0,
    'Factory-built panel delivery. Crane erection by Wicklow Timber Systems crew. 2-day crane hire.'
  ),
  (
    '40000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    'First Fix Frame Inspection',
    2, '2026-07-27', '2026-07-28', 'not_started', 1,
    'Structural engineer sign-off on erected frame. PE certification required for building control.'
  ),
  (
    '40000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    NULL,
    'Sole Plate & Frame Fixings',
    3, '2026-07-29', '2026-07-31', 'not_started', 2,
    'Fix sole plates to slab with chemical anchors. Install all holddown straps and bracing per engineer drawings.'
  );

-- Stage 3: Roof (starts after frame)
INSERT INTO tasks (id, project_id, stage_id, trade_id, name, duration_days, planned_start, planned_end, status, order_index, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000008',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    NULL,
    'Roof Truss Installation',
    4, '2026-08-03', '2026-08-06', 'not_started', 0,
    'Crane lift and fix prefabricated roof trusses. Brace and tie per truss manufacturer drawings.'
  ),
  (
    '40000000-0000-0000-0000-000000000009',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    NULL,
    'Sarking & Breathable Membrane',
    3, '2026-08-07', '2026-08-09', 'not_started', 1,
    'Install sarking boards and breathable roofing membrane. Lap and tape all joints.'
  ),
  (
    '40000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    NULL,
    'Natural Slate Roofing',
    10, '2026-08-10', '2026-08-19', 'not_started', 2,
    'Fix natural Bangor Blue slates. Include all ridge, hip, valley, and chimney flashings.'
  );

-- Stage 4: External Envelope
INSERT INTO tasks (id, project_id, stage_id, trade_id, name, duration_days, planned_start, planned_end, status, order_index, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000011',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000004',
    NULL,
    'External Insulation & Render',
    14, '2026-08-20', '2026-09-02', 'not_started', 0,
    'ETICS system: 150mm EPS insulation, mesh, basecoat, and silicone render. 3 coats.'
  ),
  (
    '40000000-0000-0000-0000-000000000012',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000004',
    NULL,
    'Window & Door Installation',
    5, '2026-09-03', '2026-09-07', 'not_started', 1,
    'Triple-glazed tilt & turn windows. Airtight taping around all reveals.'
  ),
  (
    '40000000-0000-0000-0000-000000000013',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000004',
    NULL,
    'Airtightness Test & Remediation',
    2, '2026-09-08', '2026-09-09', 'not_started', 2,
    'Blower door test. Target <1 ACH @50Pa. Remediate any failures before proceeding.'
  );

-- Stage 5: Internal Works
INSERT INTO tasks (id, project_id, stage_id, trade_id, name, duration_days, planned_start, planned_end, status, order_index, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000014',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000005',
    NULL,
    'Stud Partition Framing',
    5, '2026-09-10', '2026-09-14', 'not_started', 0,
    'Internal 100mm metal stud partitions. Include door linings and access hatches.'
  ),
  (
    '40000000-0000-0000-0000-000000000015',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000005',
    NULL,
    'First Fix Plasterboard',
    7, '2026-09-15', '2026-09-21', 'not_started', 1,
    'Fix 12.5mm plasterboard to all partitions and ceilings. Tape, fill, and skim finish.'
  ),
  (
    '40000000-0000-0000-0000-000000000016',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000005',
    NULL,
    'Screed & Floor Insulation',
    4, '2026-09-22', '2026-09-25', 'not_started', 2,
    '75mm PIR floor insulation below 65mm liquid screed. Allow 14 days before tiling.'
  );

-- Stage 6: Services
INSERT INTO tasks (id, project_id, stage_id, trade_id, name, duration_days, planned_start, planned_end, status, order_index, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000017',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000006',
    NULL,
    'MVHR Installation',
    5, '2026-09-10', '2026-09-14', 'not_started', 0,
    'Install Zehnder ComfoAir MVHR unit and all ductwork. Commission before airtightness test.'
  ),
  (
    '40000000-0000-0000-0000-000000000018',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000006',
    NULL,
    'Plumbing First Fix',
    7, '2026-09-15', '2026-09-21', 'not_started', 1,
    'Hot and cold runs, waste, ASHP connections, UFH manifolds.'
  ),
  (
    '40000000-0000-0000-0000-000000000019',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000006',
    NULL,
    'Electrical First Fix',
    7, '2026-09-15', '2026-09-21', 'not_started', 2,
    'Cable runs, consumer unit position, EV charger rough-in, LED driver positions.'
  );

-- Stage 7: Finishes
INSERT INTO tasks (id, project_id, stage_id, trade_id, name, duration_days, planned_start, planned_end, status, order_index, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000007',
    NULL,
    'Tiling — Bathrooms & Kitchen',
    10, '2026-10-12', '2026-10-21', 'not_started', 0,
    'Large format porcelain tiles (600x1200). Wet areas require tanking membrane first.'
  ),
  (
    '40000000-0000-0000-0000-000000000021',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000007',
    NULL,
    'Kitchen & Joinery Fit-Out',
    7, '2026-10-22', '2026-10-28', 'not_started', 1,
    'Kitchen unit installation, worktop templating and fitting, snagging with supplier.'
  ),
  (
    '40000000-0000-0000-0000-000000000022',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000007',
    NULL,
    'Decoration & Snagging',
    10, '2026-10-29', '2026-11-07', 'not_started', 2,
    'Two coats emulsion throughout. Gloss on all joinery. Full snagging list before handover.'
  );

-- ============================================================
-- TASK DEPENDENCIES
-- Realistic build sequence: Foundation → Frame → Roof → Envelope → Internal
-- ============================================================

INSERT INTO task_dependencies (task_id, depends_on_task_id)
VALUES
  -- Foundation chain
  ('40000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001'), -- Excavation after Site Setup
  ('40000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002'), -- Block Wall after Excavation
  ('40000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003'), -- Slab after Block Wall

  -- Frame after slab
  ('40000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000004'), -- Frame Delivery after Slab
  ('40000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000005'), -- Inspection after Erection
  ('40000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000006'), -- Fixings after Inspection

  -- Roof after frame fixings
  ('40000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000007'), -- Trusses after Frame Fixings
  ('40000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000008'), -- Sarking after Trusses
  ('40000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000009'), -- Slate after Sarking

  -- External envelope after roof
  ('40000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000010'), -- Render after Slate
  ('40000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000011'), -- Windows after Render
  ('40000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000012'), -- Airtightness after Windows

  -- Internal works after airtightness
  ('40000000-0000-0000-0000-000000000014', '40000000-0000-0000-0000-000000000013'), -- Stud Partitions after Airtightness
  ('40000000-0000-0000-0000-000000000015', '40000000-0000-0000-0000-000000000014'), -- Plasterboard after Partitions
  ('40000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000015'), -- Screed after Plasterboard

  -- Finishes after screed cures
  ('40000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000016'), -- Tiling after Screed
  ('40000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000020'), -- Kitchen after Tiling
  ('40000000-0000-0000-0000-000000000022', '40000000-0000-0000-0000-000000000021'); -- Decoration after Kitchen

-- ============================================================
-- MATERIALS
-- ============================================================

-- Slab task materials (lead_time important — concrete needs ordering)
INSERT INTO materials (task_id, name, quantity, lead_time_days, order_by_date, order_status, estimated_cost, supplier_name, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000004',
    'Ready Mix Concrete C25/30',
    '22 m³',
    3,
    '2026-06-19',
    'not_ordered',
    2640.00,
    'Roadstone Concrete, Bray',
    'C25/30 P.4 with plasticiser. Confirm pour date 48h in advance. Pumping surcharge applies.'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'A393 Reinforcement Mesh',
    '45 sheets',
    5,
    '2026-06-17',
    'not_ordered',
    1350.00,
    'Ennio Steel, Dublin',
    'A393 sheets 4.8x2.4m. Lap 300mm min. Ensure spacers for 40mm cover.'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '200mm PIR Insulation (Xtratherm)',
    '130 m²',
    7,
    '2026-06-15',
    'not_ordered',
    3250.00,
    'Xtratherm Ireland',
    'Below-slab insulation. Butt joints staggered. Keep dry before pour.'
  );

-- Timber Frame materials (long lead time — factory manufacture)
INSERT INTO materials (task_id, name, quantity, lead_time_days, order_by_date, order_status, estimated_cost, supplier_name, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000005',
    'Timber Frame Kit — Full Structure',
    '1 lot',
    70,
    '2026-05-13',
    'ordered',
    87500.00,
    'Wicklow Timber Systems',
    'Includes all wall panels, floor cassettes, and beam package. Final drawings signed off 2026-04-20.'
  ),
  (
    '40000000-0000-0000-0000-000000000005',
    'Chemical Anchors (Hilti HIT-RE 500)',
    '200 units',
    5,
    '2026-07-17',
    'not_ordered',
    480.00,
    'Hilti Ireland',
    'M16 anchors for sole plate fixing. Minimum embedment 150mm into slab. Cold-weather variant if temp <5°C.'
  );

-- Roof materials (slates — lead time from quarry)
INSERT INTO materials (task_id, name, quantity, lead_time_days, order_by_date, order_status, estimated_cost, supplier_name, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000010',
    'Bangor Blue Natural Slate (500x250mm)',
    '3,200 slates',
    21,
    '2026-07-20',
    'not_ordered',
    9600.00,
    'Welsh Slate Ltd via Pat McDonnell Paints',
    'Grade A, 500x250mm. Include 15% wastage. Match sample board approved by client.'
  ),
  (
    '40000000-0000-0000-0000-000000000010',
    'Lead Flashings (code 4 & code 5)',
    '45 kg',
    3,
    '2026-08-07',
    'not_ordered',
    720.00,
    'Midland Lead, via local merchant',
    'Code 4 for soakers, code 5 for back gutters and chimney. Conform to BS EN 12588.'
  );

-- MVHR (long lead — specialist equipment)
INSERT INTO materials (task_id, name, quantity, lead_time_days, order_by_date, order_status, estimated_cost, supplier_name, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000017',
    'Zehnder ComfoAir Q350 MVHR Unit',
    '1 unit',
    28,
    '2026-08-13',
    'not_ordered',
    3800.00,
    'Zehnder Ireland',
    'Q350 Right Hand. Include commissioning kit and training for self-commissioning.'
  );

-- Windows (long lead — factory manufacture)
INSERT INTO materials (task_id, name, quantity, lead_time_days, order_by_date, order_status, estimated_cost, supplier_name, notes)
VALUES
  (
    '40000000-0000-0000-0000-000000000012',
    'Triple Glazed Tilt & Turn Windows — Full Set',
    '1 lot (14 units)',
    42,
    '2026-07-22',
    'not_ordered',
    28000.00,
    'Internorm via Passive House Systems',
    'KF410 aluminium-clad. All sizes per architect schedule v3. Include cill extensions and airtight tapes.'
  );

-- ============================================================
-- NOTIFICATION PREFERENCES (test user)
-- ============================================================

INSERT INTO notification_preferences (user_id, order_deadlines, overdue_tasks, cascade_summaries, order_warning_days)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  true,
  true,
  true,
  5
);
