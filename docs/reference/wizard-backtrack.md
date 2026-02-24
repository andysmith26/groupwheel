# Manual Test Instructions: Wizard Backtrack in Specific Mode

## Purpose

Verify that the wizard's Continue button remains enabled when backtracking to the Groups step after defining valid groups in specific mode.

## Test Steps

### Test 1: Backtrack with Valid Groups in Specific Mode

1. Navigate to `/groups/new` in your browser
2. **Step: Students**
   - Paste roster data (example below)
   - Click Continue
3. **Step: Groups**
   - Click "I have specific groups to fill"
   - Add first group: Name="Team Alpha", Capacity=2
   - Add second group: Name="Team Beta", Capacity=2
   - Verify Continue button is enabled
   - Click Continue
4. **Step: Preferences**
   - Verify you're on the Preferences step
   - Click Back
5. **Step: Groups (returned)**
   - Verify "I have specific groups to fill" is still selected
   - Verify both groups are still visible with their names and capacities
   - **VERIFY: Continue button should be ENABLED** ✓ (This was the bug - it was disabled before)
   - Click Continue again
6. **Step: Preferences (returned)**
   - Verify you can continue through the wizard
   - Click Continue (skip preferences)
7. **Step: Name**
   - Enter activity name
   - Click "Create Groups"
8. **Verify**: Should land on workspace with Team Alpha and Team Beta groups

### Test 2: Backtrack in Auto Mode

1. Navigate to `/groups/new`
2. Paste roster data and Continue
3. Click "Just split students into groups"
4. Verify Continue button is enabled
5. Click Continue to Preferences
6. Click Back to return to Groups
7. **VERIFY: Continue button should still be ENABLED** ✓
8. Complete the wizard normally

### Test 3: Backtrack with Invalid Groups

1. Navigate to `/groups/new`
2. Paste roster data and Continue
3. Click "I have specific groups to fill"
4. Add a group but leave the name empty
5. Verify Continue button is disabled
6. Go to another tab or step (if possible)
7. Return to Groups step
8. **VERIFY: Continue button should still be DISABLED** ✓

## Sample Roster Data

```
name	id	grade
Alice Smith	alice@example.com	5
Bob Jones	bob@example.com	5
Carol White	carol@example.com	5
Dave Brown	dave@example.com	5
```

## Expected Results

- ✅ Valid groups preserve their validity when backtracking
- ✅ Invalid groups remain invalid when backtracking
- ✅ Auto mode always remains valid
- ✅ All group data is preserved when navigating back and forth
- ✅ User can complete the wizard successfully after backtracking

## Notes

This fix addresses the regression introduced when the Groups step was unified to include both the fork question and the content in a single component. The issue was that `shellBuilderValid` was initialized to `false` on every mount, losing the validity state that was previously preserved in the parent component.
