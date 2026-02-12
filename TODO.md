# TODO: Implement 1-20% Deduction Buttons in Admin Edit Balance Modal

## Steps to Complete:
- [x] Add event listeners for percentage buttons (.percent-btn) in admin.js
- [x] Implement deduction logic: deduct selected percentage from withdrawal amount (not from total balance)
- [x] Update the new-balance input field with formatted value
- [x] Set appropriate message in edit-reason textarea (e.g., "Deducted X% from withdrawal amount")
- [x] Test the modal functionality to ensure buttons work correctly
- [x] Add deduction_percentage column to database schema
- [x] Store selected percentage in database when saving admin changes
- [x] Apply deduction percentage to user withdrawals in user.js
- [x] Fix save changes button in admin - ensure it saves the selected deduction percentage
- [x] Ensure percent buttons do not generate messages in admin - they only set the percentage for user withdrawals
