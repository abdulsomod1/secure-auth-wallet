# TODO - Balance Loading Fix

## Task
Fix the balance display so that the database balance (from admin) is not shown before the portfolio balance is calculated. If portfolio is empty, then show database balance.

## Changes Made in user.js:

### Modified `initializeUserData()` function
- **REMOVED**: The code that immediately sets `currentBalance = dbBalance` after fetching
- **KEPT**: `balanceLoaded = false` until portfolio balance is fully calculated
- **NEW LOGIC**: The balance is now determined AFTER:
  1. Loading the portfolio
  2. Calculating the portfolio balance
  3. Fetching live prices
  4. Then determining whether to use portfolio balance or database balance

### The new flow:
1. balanceLoaded = false (shows "....")
2. Fetch database balance (but DON'T use it yet)
3. Load portfolio
4. Calculate portfolio balance with placeholder prices
5. Fetch live prices
6. Update portfolio with live prices
7. Recalculate balance:
   - If portfolioSum > 0, use portfolio balance
   - If portfolioSum = 0, use database balance (from admin)
8. balanceLoaded = true (show the final balance)

## Status
- [x] Implement the fix in user.js
