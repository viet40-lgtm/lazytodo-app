# STRICT WORKSPACE RULES

## 1. GIT COMMITS & PUSHES — STRICT MANUAL ONLY
- **NEVER AUTO-COMMIT OR AUTO-PUSH**: You are STRICTLY FORBIDDEN from running `git commit` or `git push` on your own initiative.
- **ONLY ON EXPLICIT USER INSTRUCTION**: You must ONLY run `git commit` and `git push` when the user explicitly types a command like "commit and push", "commit", or "push" in their prompt.
- After making code edits, running builds, or testing, STOP. Report the result to the user. DO NOT COMMIT. DO NOT PUSH.

## 2. Typography & Font Sizes
- The app MUST ONLY use the following font sizes: `30`, `25`, and `20`.

## 3. Data Protection
- Never permanently erase user tasks due to errors or background routines. Use `deleted: true` tombstoning.

## 4. Recurring Logic
- "Daily", "Weekly", "Monthly", and "Yearly" tasks anchor to natural calendar resets.
