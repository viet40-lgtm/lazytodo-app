# Lazy To-Do App Rules

This file contains strict guidelines and preferences for the development of the Lazy To-Do app.

## 1. Typography & Font Sizes
- **Strict Sizing**: The app MUST ONLY use the following three font sizes: `30`, `25`, and `20`.
- **No Variations**: Do NOT use any other font sizes (e.g., no `14`, `16`, `17`, `18`, `22`, etc.). If a text element doesn't fit, it must wrap or be redesigned. The font size itself cannot be changed to accommodate it.

## 2. Data Protection
- **No Auto-Deletion**: The system must NEVER automatically delete or permanently erase user tasks due to validation errors, parsing errors, or background routines.
- **Tombstoning**: If a task is explicitly deleted or skipped by the user, it should be marked as `deleted: true` rather than being wiped from the array. This protects against accidental complete data wipes during cloud syncing.

## 3. Recurring Logic
- "Daily", "Weekly", "Monthly", and "Yearly" tasks are anchored to natural calendar resets (e.g. Midnight, Monday, the 1st of the month, Jan 1st) and do NOT require a strict Reminder time.
- "Bi-Weekly" tasks require an anchor. When skipped or checked off, they anchor to the Monday of the week that occurs 14 days later.
