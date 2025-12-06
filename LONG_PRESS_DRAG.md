# Long Press Drag Implementation

## 🎯 Final Solution: Long Press to Drag

### User Requirement
- ✅ **Click and Long Press** (300ms) to start drag
- ✅ **No preview on simple click** - only after long press
- ✅ **No movement required** - just hold for 300ms
- ✅ **Cancel if moved** - moving > 10px during long press cancels it

## How It Works

### 1. Click and Hold (Long Press)
```
User clicks entry
    ↓
pointerdown event
    ↓
Start 300ms timer
    ↓
Wait... (user holds mouse button)
    ↓
Timer completes (300ms passed)
    ↓
✅ Drag starts
    ↓
Show preview "X entries"
    ↓
Groups highlight on hover
    ↓
Release on group → Move entries
```

### 2. Simple Click (No Long Press)
```
User clicks entry
    ↓
pointerdown event
    ↓
Start 300ms timer
    ↓
User releases mouse (< 300ms)
    ↓
pointerup event
    ↓
❌ Timer cancelled
    ↓
✅ Normal click → Select entry
```

### 3. Move During Long Press (Cancelled)
```
User clicks and holds
    ↓
pointerdown event
    ↓
Start 300ms timer
    ↓
User moves mouse > 10px (hand tremor protection)
    ↓
pointermove event
    ↓
❌ Timer cancelled
    ↓
✅ Treated as click
```

## Implementation Details

### Key Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `longPressDuration` | 300ms | Time to hold before drag starts |
| `movementThreshold` | 10px | Max movement allowed during long press |
| `wasDragging` reset | 50ms | Delay to prevent click after drag |

### Code Structure

```typescript
// hooks/usePointerDrag.ts

const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

handlePointerDown() {
    // Start timer
    longPressTimerRef.current = setTimeout(() => {
        // Start drag after 300ms
        setDragState({ isDragging: true, ... });
        wasDraggingRef.current = true;
    }, 300);
}

handleGlobalPointerMove() {
    if (pendingDragRef.current) {
        // Check if moved too much
        if (distance > 10) {
            // Cancel long press
            clearTimeout(longPressTimerRef.current);
            pendingDragRef.current = null;
        }
    }
}

handleGlobalPointerUp() {
    // Clear timer if released early
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
    }
}
```

## User Experience

### ✅ What Works Now

1. **Simple Click**
   - Click and release quickly (< 300ms)
   - ✅ Entry selected
   - ✅ No drag preview
   - ✅ No movement

2. **Long Press Drag**
   - Click and hold for 300ms
   - ✅ Drag preview appears
   - ✅ Can move to groups
   - ✅ Groups highlight
   - ✅ Release to drop

3. **Accidental Movement**
   - Click and hold, but hand moves > 10px
   - ✅ Long press cancelled
   - ✅ Treated as click
   - ✅ No drag triggered

4. **Multi-Select Drag**
   - Select multiple entries
   - Long press on any selected entry
   - ✅ All selected entries drag together

### Visual Feedback Timeline

```
Time: 0ms
    User clicks
    ↓
    [No visual change]

Time: 0-300ms
    User holding...
    ↓
    [Still no visual change - waiting]

Time: 300ms
    Long press detected!
    ↓
    [Drag preview appears]
    [Cursor at current position]

Time: 300ms+
    User moves mouse
    ↓
    [Preview follows cursor]
    [Groups highlight on hover]

Time: Release
    User releases mouse
    ↓
    [Drop on group or cancel]
```

## Configuration

You can customize the long press duration:

```typescript
const { handlePointerDown, ... } = usePointerDrag({
    longPressDuration: 500, // 500ms instead of default 300ms
    onDragStart: (entryIds) => { ... },
    onDragEnd: (entryIds, targetGroupId) => { ... }
});
```

## Testing Checklist

- [x] Click and release quickly → Select entry
- [x] Click and hold 300ms → Start drag
- [x] Drag preview appears only after 300ms
- [x] Move during long press (> 10px) → Cancel
- [x] Multi-select drag works
- [x] Drop on group → Move entries
- [x] Drop on empty space → Cancel
- [x] No click event after drag
- [x] Cmd+Click still works for multi-select
- [x] Shift+Click still works for range select

## Comparison with Previous Approaches

| Approach | Trigger | Issue | Status |
|----------|---------|-------|--------|
| **HTML5 DnD** | dragstart event | Doesn't work in Tauri macOS | ❌ Abandoned |
| **Distance Threshold** | Move 15px | Accidental drags from clicks | ❌ Replaced |
| **Long Press** | Hold 300ms | Perfect for intentional drag | ✅ **Current** |

## Why Long Press is Better

1. **Clear Intent**: User must deliberately hold for 300ms
2. **No Accidents**: Simple clicks never trigger drag
3. **Natural Feel**: Similar to mobile long-press interactions
4. **Forgiving**: 10px movement threshold for hand tremors
5. **Visual Clarity**: Preview only shows when drag actually starts

## Technical Notes

### Timer Management
- Timer created on `pointerdown`
- Cleared on `pointerup` (early release)
- Cleared on `pointermove` (if moved > 10px)
- Cleared on component unmount

### Memory Leaks Prevention
```typescript
useEffect(() => {
    return () => {
        // Clean up timer on unmount
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
    };
}, []);
```

### State Synchronization
- `pendingDragRef`: Tracks if waiting for long press
- `wasDraggingRef`: Tracks if drag actually happened
- `dragState.isDragging`: Controls preview visibility

## Future Enhancements

Possible improvements:
- [ ] Visual feedback during long press (progress indicator)
- [ ] Haptic feedback on long press complete (if supported)
- [ ] Configurable movement threshold
- [ ] Touch device support with different duration
