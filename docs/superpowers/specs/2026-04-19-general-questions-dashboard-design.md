# General Questions Dashboard Changes - Design Spec

## Date: 2026-04-19

## Overview
Update the General Questions section in the admin dashboard to always show (with placeholder when empty), move below Doctor Performance, and dynamically display all non-text question types.

## Changes

### 1. Layout - Move Below Doctor Performance
- Current: General Questions section appears ABOVE Doctor Performance
- New: General Questions section appears BELOW Doctor Performance

### 2. Always Show Section (No Conditional Display)
- Current: Section only renders when `analytics?.question_breakdown?.length > 0 || analytics?.yesno_breakdown?.length > 0`
- New: Always render the section container
- When no data: Show "No data yet" placeholder (same style as Doctor Performance empty state)

### 3. Unified Section - All Non-Text Question Types
Include ALL general question types EXCEPT `text` input:

| Question Type | Display Format |
|--------------|-----------------|
| stars | Progress bar with average (current) |
| yes_no | YES count + NO count + percentages |
| single_choice | Option name + count + percentage bars |
| multi_choice | Option name + count + percentage bars |
| number | Average + min/max/count stats |

### 4. Dynamic Rendering
- Read from `analytics.star_rating_breakdown` for star questions
- Read from `analytics.yesno_breakdown` for yes/no questions
- Future-proof: reads whatever question types are configured
- Does NOT require code changes when new question types are added (except text)

### 5. Remove Separate Pie Charts
- Current: Yes/No questions render as separate PieChart components above General Questions
- New: Yes/No data included inline within the unified General Questions section
- Remove the conditional section that renders pie charts separately

## UI/UX Specifications

### Empty State
```
┌─────────────────────────────────────────────────┐
│  General Questions - Average Rating             │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                          │   │
│  │         📊 No data yet                   │   │
│  │    Complete surveys to see analytics     │   │
│  │                                          │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### With Data - Star Question
```
Question Label Here
★★★★● ████████████░░░  4.2 / 5
0    1    2    3    4    5
```

### With Data - Yes/No Question
```
Would you recommend us?
Yes: 45 (75%)  ██████████████░
No:  15 (25%)  ███░
```

### With Data - Single Choice
```
How did you hear about us?
Friend: 30 (50%)  ██████████████░
Social Media: 20 (33%)  █████████░
Website: 10 (17%)  ████░
```

## Acceptance Criteria

1. Section appears BELOW Doctor Performance card
2. Section is always visible (not hidden when no data)
3. Empty state shows "No data yet" message when no responses
4. All non-text question types display dynamically
5. Yes/No shows counts/percentages (NOT pie charts)
6. No code changes needed when adding new non-text questions
7. Works with existing analytics data structure