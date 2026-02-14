# TODO: Price Fetching Improvements

## Task: Fix price fetching issues in user.js

### Requirements:
1. If live price is not fetched yet, don't show any price
2. Make price fetching faster
3. Don't delete unnecessary code
\4. Don't do what user didn't ask

### Implementation Steps:

- [x] 1. Add `livePricesFetched` flag to track if live prices have been successfully fetched
- [ ] 2. Modify `updatePortfolio()` to check this flag and only show prices if true, otherwise show empty/placeholder
- [ ] 3. Make price fetching faster by:
  - [ ] 3a. Call `updateLivePrices()` immediately in `initializeUserData()` before other operations
  - [ ] 3b. Reduce the interval from 30 seconds to 15 seconds
  - [ ] 3c. Add a timeout to the fetch to prevent it from hanging
- [ ] 4. Set `livePricesFetched = false` initially, and only set to `true` after successful fetch
- [ ] 5. Test the implementation

### File to Edit:
- user.js
