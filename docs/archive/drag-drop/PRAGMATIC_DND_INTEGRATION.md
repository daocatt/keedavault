# Pragmatic Drag-and-Drop Integration Guide

## Overview
We've installed `@atlaskit/pragmatic-drag-and-drop` and created two helper components to replace the native HTML5 drag-and-drop implementation.

## Components Created

### 1. DraggableEntryRow.tsx
- Wraps entry rows in EntryList
- Handles drag source logic
- Creates custom drag preview with first 3 columns (title, username, email)
- Manages drag state

### 2. DropTargetGroupItem.tsx  
- Wraps group items in Sidebar
- Handles drop target logic
- Provides `isDragOver` state via render prop pattern
- Triggers drop callbacks

## Integration Steps

### EntryList.tsx

1. Import the component:
```tsx
import { DraggableEntryRow } from './DraggableEntryRow';
```

2. Replace the entry row div (around line 818) with:
```tsx
<DraggableEntryRow
    key={entry.uuid}
    entry={entry}
    isSelected={selectedEntryIds.has(entry.uuid)}
    selectedEntryIds={selectedEntryIds}
    onClick={(e) => { e.stopPropagation(); handleEntryClick(e, entry); }}
    onContextMenu={(e) => handleContextMenu(e, entry)}
    onMouseEnter={(e) => {
        if (!selectedEntryIds.has(entry.uuid)) {
            e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
        }
    }}
    onMouseLeave={(e) => {
        if (!selectedEntryIds.has(entry.uuid)) {
            e.currentTarget.style.backgroundColor = 'transparent';
        }
    }}
    className={`py-1.5 flex items-center cursor-grab active:cursor-grabbing transition-colors group select-none ${selectedEntryIds.has(entry.uuid) ? 'font-medium' : ''}`}
    style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backgroundColor: selectedEntryIds.has(entry.uuid) ? 'var(--color-accent-light)' : 'transparent',
        color: selectedEntryIds.has(entry.uuid) ? 'var(--color-accent)' : 'var(--color-text-primary)'
    }}
>
    {/* All the existing column content goes here */}
</DraggableEntryRow>
```

3. Remove all the old `draggable={true}`, `onDragStart`, `onDrag`, `onDragEnd` handlers.

### Sidebar.tsx

1. Import the component:
```tsx
import { DropTargetGroupItem } from './DropTargetGroupItem';
```

2. In the GroupItem component (around line 228), wrap the group item div with:
```tsx
<DropTargetGroupItem
    groupUuid={group.uuid}
    groupName={group.name}
    isRecycleBin={group.isRecycleBin || false}
    onDrop={async (entryIds, targetGroupId) => {
        try {
            if (group.isRecycleBin) {
                for (const entryId of entryIds) {
                    await onMoveToRecycleBin(entryId);
                }
                addToast({ title: 'Moved to Recycle Bin', type: 'success' });
            } else {
                await onMoveEntries(entryIds, targetGroupId);
            }
        } catch (err) {
            console.error('❌ Failed to move entries:', err);
            addToast({ title: 'Failed to move entries', type: 'error' });
        }
    }}
>
    {(isDragOver) => (
        <div
            className={`flex items-center px-0 py-1 my-0.5 rounded-md cursor-pointer text-sm transition-all duration-200 group relative pr-2 ${isActive ? 'font-medium' : ''}`}
            style={{
                paddingLeft: `${depth * 12 + 8}px`,
                backgroundColor: isDragOver
                    ? 'var(--color-accent-light)'
                    : isActive
                        ? 'var(--color-accent-light)'
                        : isHovered
                            ? 'var(--color-bg-hover)'
                            : 'transparent',
                color: isDragOver ? 'var(--color-accent)' : (isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)'),
                border: isDragOver ? '2px solid var(--color-accent)' : '1px solid transparent',
                boxShadow: isDragOver ? '0 0 0 2px var(--color-accent-light)' : 'none',
                pointerEvents: 'auto',
                minHeight: '32px'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => onSelect(group.uuid)}
            data-group-uuid={group.uuid}
            onContextMenu={(e) => onContextMenu(e, group, parentId)}
            title={`Drop entries here to move to ${group.name}`}
        >
            {/* All existing group item content */}
        </div>
    )}
</DropTargetGroupItem>
```

3. Remove all the old `handleDragEnter`, `handleDragOver`, `handleDragLeave`, `handleDrop` handlers and their event bindings.

4. Remove the `isDragOver` state from GroupItem (it's now provided by DropTargetGroupItem).

## Benefits

1. **Reliability**: Works consistently across all platforms including Tauri
2. **Clean API**: Simpler, more declarative code
3. **Better Performance**: Optimized event handling
4. **No Green Plus Icon**: Proper cursor handling built-in
5. **Type Safety**: Full TypeScript support

## Testing

After integration:
1. Drag an entry from EntryList
2. Hover over a group in Sidebar - should see highlight
3. Drop on a group - entries should move
4. Check console for "Pragmatic DnD" logs
