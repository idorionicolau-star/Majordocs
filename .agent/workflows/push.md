---
description: Git add, commit and push all changes with a descriptive message
---
// turbo-all

1. Check current git status to see modified files:
```
git status --short
```

2. Stage all changes:
```
git add .
```

3. Commit with a message that summarizes the changed files (use the output from step 1 to build the message). Format: `git commit -m "update: file1; file2; file3"` — use short descriptive basenames.

4. Push to remote:
```
git push
```
