# Change Spec: cc-loop3-stepper-touch-targets

## Gap Evidence

### Quality Gap
- **Gap ID:** imp-stepper-touch-target
- **Category:** interaction_improvement
- **Severity:** low
- **Root Cause:** implementation_bug
- **Root Cause Evidence:** WCAG 2.5.5 is a known standard; the builder chose w-7 h-7 (~28px) when 44px is the documented minimum for touch targets. No spec ambiguity — this is an implementation oversight.

### Current State (What's Wrong)
- **Description:** The stepper +/- buttons in the notification preferences panel (order_warning_days control) use Tailwind classes `w-7 h-7` which renders at approximately 28×28px. This is below the 44×44px minimum touch target size recommended by WCAG 2.5.5 and platform guidelines (iOS HIG, Material Design). On mobile devices, users may struggle to accurately tap these buttons.
- **PO Review Assessment:** "Stepper +/- buttons are w-7 h-7 (~28px) — below the 44px minimum touch target recommended for mobile"
- **Heuristics Failed:** WCAG 2.5.5 (Target Size), Nielsen Heuristic 4 (Consistency and standards — iOS/Android both specify 44pt minimum)
- **Affected Screens:** /settings
- **Affected Journeys:** Configure notification preferences

### Previous Attempts (Do Not Repeat)
First attempt.

## Target State

### From Library Heuristics
- **WCAG 2.5.5 — Target Size (Enhanced):** Interactive elements must have a minimum 44×44 CSS pixel touch target. Measurement: computed width and height of the button element >= 44px. Verified via DOM query (`getComputedStyle(el).width >= '44px'` and `getComputedStyle(el).height >= '44px'`).
- **Nielsen Heuristic 4 — Consistency and Standards:** Touch targets must meet platform-standard minimums. iOS HIG specifies 44pt, Material Design specifies 48dp. 44px is the minimum acceptable cross-platform target.

### From Reference Products
Not applicable — this is a standards compliance fix, not a competitive gap.

### Concrete Description
The stepper +/- buttons should have a touch target of at least 44×44px. The visual icon inside the button can remain at its current size — the touch target area is what needs to be large enough. Change the button classes from `w-7 h-7` to `w-11 h-11` (44px at default Tailwind scale where 1 unit = 4px). The button content (the + and - text/icons) remains centered within the larger target area.

After the change, the stepper row should still look balanced: the larger buttons should not cause the stepper component to overflow or look disproportionate relative to the numeric display between them. The existing `rounded-md border` styling should scale naturally with the size increase. The `tabular-nums` display between the buttons maintains its position.

## Design Requirements

- **Requires Design Mode:** false
- **Design Mode Scope:** N/A
- **Design Direction:** Increase button dimensions from w-7 h-7 to w-11 h-11. The visual styling (border, rounded-md, font-medium, transition-colors) remains unchanged. The content (+ and - characters) stays centered in the larger area. No other visual changes needed.
- **Design Constraints:** The stepper component's overall layout within the notification preferences panel must remain unchanged. Only the button dimensions change. The settings page layout, spacing, and all other form controls must not be affected.

## Acceptance Criteria

AC-ST-1: Stepper buttons meet 44px minimum touch target
  GIVEN user is on the /settings page viewing notification preferences
  WHEN the stepper +/- buttons are rendered
  THEN each button has a computed width >= 44px and computed height >= 44px
  MEASUREMENT: DOM query — both stepper buttons' computedStyle width and height are >= 44px. Alternatively, verify the Tailwind classes include w-11 h-11 (or min-w-[44px] min-h-[44px])
  HEURISTIC: WCAG 2.5.5 (Target Size)
  CLOSES_GAP: imp-stepper-touch-target

AC-ST-2: Stepper layout remains balanced after size increase
  GIVEN user is on the /settings page viewing notification preferences
  WHEN the stepper buttons are rendered at the larger size
  THEN the stepper row (minus button, numeric display, plus button) is horizontally aligned and does not overflow its container
  MEASUREMENT: The stepper container does not exhibit horizontal overflow; all three elements (-, value, +) remain visible and aligned on a single row
  CLOSES_GAP: imp-stepper-touch-target

AC-ST-3: Stepper buttons remain functional after resize
  GIVEN user is on the /settings page
  WHEN user clicks/taps the + button
  THEN the order_warning_days value increments by 1 (up to max)
  MEASUREMENT: The displayed numeric value increases by 1 after each tap of +, and decreases by 1 after each tap of -
  CLOSES_GAP: imp-stepper-touch-target

AC-ST-4: Stepper button accessibility attributes preserved
  GIVEN user is on the /settings page
  WHEN the stepper buttons are rendered
  THEN each button retains its aria-label and is keyboard-focusable with visible focus ring
  MEASUREMENT: DOM query — buttons have aria-label attributes and :focus-visible styles applied
  HEURISTIC: Nielsen Heuristic 4 (Consistency and standards)
  CLOSES_GAP: imp-stepper-touch-target

## Scope

### In Scope
- The stepper +/- button elements in `components/notifications/NotificationPreferencesPanel.tsx`
- Specifically the `w-7 h-7` class declarations on the two stepper buttons

### Out of Scope (Do Not Touch)
- All other elements in NotificationPreferencesPanel.tsx (toggles, labels, descriptions)
- All other pages and components
- Stepper logic (increment/decrement/min/max behavior)
- Server actions related to notification preferences

### Regression Risk
- Low — this is a CSS dimension change on two button elements. Verify that:
  - The stepper row still fits within the panel at 375px mobile width
  - The button text (+/-) remains properly centered
  - Existing acceptance criteria AC-NS-1 through AC-NS-4 should be re-verified after this change

## Root Cause Context

- **Classification:** implementation_bug
- **What Went Wrong:** The builder set stepper button dimensions to w-7 h-7 (~28px), which is below the WCAG 2.5.5 minimum of 44px for touch targets. This is a known accessibility standard that was not applied during implementation. The spec (AC-NS-2) mentioned the stepper control but did not explicitly specify touch target dimensions.
- **Why Previous Approach Failed:** No previous approach — first attempt.
- **What's Different This Time:** The change spec explicitly specifies w-11 h-11 (44px) as the target dimension, references the WCAG standard, and provides clear measurement criteria for verification.
