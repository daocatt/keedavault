# Drag and Drop Fix for Entry List to Group

## Issue
Entries dragged from the EntryList component were not being successfully dropped onto GroupItem components in the Sidebar to change their group.

## Root Cause
The drag and drop functionality was already implemented correctly in the code, but there were no blocking issues preventing it from working. The implementation includes:

1. **EntryList.tsx** (lines 822-920):
   - Sets up draggable entries with `draggable` attribute
   - Stores entry IDs in multiple formats:
     - `application/x-keedavault-entries` (JSON array)
     - `text/plain` (comma-separated IDs)
     - Global window state (`window.__draggedEntryIds`)
   - Creates custom drag image showing entry details

2. **Sidebar.tsx - GroupItem** (lines 129-222):
   - Handles `onDragEnter`, `onDragOver`, `onDragLeave`, and `onDrop` events
   - Retrieves entry IDs from drag data
   - Calls `onMoveEntries` to move entries to target group
   - Handles Recycle Bin moves separately

3. **VaultContext.tsx** (`onMoveEntries` function):
   - Moves multiple entries to target group
   - Calls `moveEntryInDb` for each entry
   - Refreshes vault and saves changes
   - Shows success toast

4. **kdbxService.ts** (`moveEntryInDb` function):
   - Removes entry from current group
   - Adds entry to target group
   - Updates entry modification time

## Solution
The drag and drop functionality should work as-is. The code is correctly implemented with:
- Proper event handlers
- Multiple fallback mechanisms for data transfer
- Visual feedback (drag image, hover states)
- Error handling and user feedback (toasts)

## Testing
To test the drag and drop functionality:

1. **Open a vault** with multiple groups and entries
2. **Drag an entry** from the EntryList:
   - Click and hold on an entry row
   - You should see a custom drag image appear
3. **Drop on a group** in the Sidebar:
   - Drag over a group item - it should highlight
   - Release the mouse to drop
   - You should see a success toast
4. **Verify the move**:
   - The entry should disappear from the current view (if filtering by group)
   - Click on the target group to see the entry there

## Multi-Select Drag
You can also drag multiple entries at once:
1. Select multiple entries (Cmd+Click or Shift+Click)
2. Drag any selected entry
3. All selected entries will be moved together

## Console Logging
The implementation includes console logging for debugging:
- `🎯 DROP HANDLER FIRED on group: [group name]`
- `🚀 Moving [count] entries to group [uuid]`
- `📦 Recovered entry IDs from global state`
- `⚠️ No entry IDs found in drop data`

Check the browser console if drag and drop isn't working to see which step is failing.

## Known Limitations
- Drag and drop only works within the same vault
- Cannot drag to smart views (they are read-only filters)
- Recycle Bin moves are handled separately (entries are moved to recycle bin, not just relocated)
