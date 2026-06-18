---
description: Delete previous claude code session histories.
allowed-tools: Bash(cd:*), Bash(rm:*)
---

## Your task:
Your job is first to list all the claude code session histories of this project. Go to `.claude/projects/<matching-project-id>` for the history `.jsonl` files. Inside these `jsonl` files, look for below two object items:

```json
{
  "type":"...",
  "mode":"...","sessionId":"788fa016-e419-4b99-99f4-3a3bddb2a0b0"
}
{
  "type": "ai-title",
  "aiTitle": "..."
}
```

Then get 'sessionId' and 'aiTitle' properties from above and
Make a **numbered** list with these informations and print this out. The list should look like below:

1. <title> - <sessionId>
2. <title> - <sessionId>
...

Then ask users to select the numbers of the items they would like to delete. Once they give you the numbers, go ahead and delete the corresponding `.jsonl` files and print out `<N> session histories have been successfully deleted!`.

## NOTE
- The users can give you multiple numbers of items with various separators such as comma, or space.
- If there is no history to print, print out `- No session history found.` and terminate.
