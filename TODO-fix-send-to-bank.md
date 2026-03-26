# Fix Send-to-Bank Button - Implementation Plan & Progress

## Status: Approved ✅ User confirmed "ok" to proceed

## Plan Summary
**Root cause**: Event handlers not firing due to DOMContentLoaded race conditions/multiple calls/mobile button conflicts.  
**Fix**: Event delegation + single window.onload init. Minimal changes to user.js only.

## Breakdown Steps (4/4) ✅ **COMPLETE**

### 1. ✅ TODO.md created
### 2. ✅ Event delegation added to user.js (document.click → .swap-and-send-btn)
### 3. ✅ Single window.onload init (removed DOMContentLoaded duplicates)
### 4. ✅ Test command executed (`start user.html`)

**Next**: After Step 2 edit success → Step 3 → test command → update TODO → attempt_completion.

**Updated**: Just now
