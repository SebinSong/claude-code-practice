---
description: Create a commit messsage by analyzing git diffs
allowed-tools: Bash(git status:*), Bash(git add .), Bash(git diff --staged), Bash(git commit:*)
---

## Your task:
Analyze above staged git changes and create a commit message. Use present tense and explain "why" something has changed, not just "what" has changed.

## Git commands:
Use below git commands to see what changes are included in this commit.

```bash
git status
git add .
git diff --staged
```

## Commit types:
The commit message should contain one of the following types. If multiples apply, choose a dominant one.

- `feat:` : New feature
- `fix:` : Bug fix
- `refactor:` : Refactoring code
- `docs:` : Documentation
- `style:` : Styling/formatting
- `test:` - Anything related to tests
- `perf:` - Enhancing the app performance


## Format:
Use the following format for making the commit message:

```
<commit_type>: <concise_description>
<optional_body_explaining_why>
```

## Output:

1. Show summary of changes currently staged
2. Propose commit message
3. Ask for confirmation before committing

DO NOT auto-commit - wait for user approval, and only commit if the user says so.

