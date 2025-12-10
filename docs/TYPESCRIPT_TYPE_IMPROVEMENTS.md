# TypeScript Type Safety Improvements

## Summary

Reviewed and improved TypeScript type definitions across React components to eliminate `any` types and ensure proper type safety.

## Issues Found and Fixed

### 1. **SettingsWindow.tsx - Select Component**

**Problem**: Generic Select component used `any` types for values and options.

**Before**:
```typescript
const Select: React.FC<{ 
  value: any; 
  onChange: (val: any) => void; 
  options: { label: string; value: any }[]; 
  label: string; 
  icon?: React.ElementType 
}> = ...
```

**After**:
```typescript
interface SelectOption {
    label: string;
    value: string;
}

interface SelectProps {
    value: string;
    onChange: (val: string) => void;
    options: SelectOption[];
    label: string;
    icon?: React.ElementType;
}

const Select: React.FC<SelectProps> = ...
```

**Rationale**: HTML `<select>` elements always work with string values, so using a generic type was unnecessary and caused type errors. Number values are now converted to strings for display and parsed back when needed.

### 2. **SettingsWindow.tsx - updateSetting Function**

**Problem**: Function parameter used `any` type for value.

**Before**:
```typescript
const updateSetting = async (
  section: 'general' | 'security', 
  key: string, 
  value: any
) => { ... }
```

**After**:
```typescript
const updateSetting = async (
  section: 'general' | 'security', 
  key: string, 
  value: string | number | boolean
) => { ... }
```

**Rationale**: Settings values are always one of these three primitive types, making the type explicit improves type safety.

### 3. **Select Component Usage - Number to String Conversion**

**Problem**: Number values were being passed directly to Select component which expects strings.

**Fixed Locations**:
- Recent File Count selector
- Clipboard Clear Delay selector  
- Lock on Inactivity selector
- Lock in Background selector

**Solution**: Convert numbers to strings for display, parse back to numbers when saving:
```typescript
value={String(settings.general.recentFileCount)}
onChange={(v) => updateSetting('general', 'recentFileCount', parseInt(v))}
options={[1, 2, 3, 4, 5, 10].map(n => ({ 
  label: `${n} files`, 
  value: String(n) 
}))}
```

## Acceptable `any` Usage

The following `any` usages were kept as they are acceptable:

### 1. **Error Catch Blocks**
```typescript
catch (e: any) {
  console.error(e.message);
}
```
**Rationale**: Errors can be of any type in JavaScript. Using `unknown` would require type guards everywhere.

### 2. **Tauri Event Listeners**
```typescript
listen('settings-changed', (event: any) => { ... })
```
**Rationale**: Tauri event payloads don't have strong typing. Could be improved with custom event types but requires significant refactoring.

### 3. **Window Resize Events**
```typescript
win.listen('tauri://resize', async (event: any) => { ... })
```
**Rationale**: Tauri internal events don't expose TypeScript types.

## TypeScript Compilation Results

✅ **All type checks passed**
```bash
npx tsc --noEmit
# Exit code: 0 (success)
```

## Benefits

1. **Type Safety**: Eliminated unnecessary `any` types
2. **Better IntelliSense**: IDEs can now provide better autocomplete
3. **Fewer Runtime Errors**: Type errors caught at compile time
4. **Maintainability**: Clearer contracts between components
5. **Documentation**: Types serve as inline documentation

## Recommendations

For future development:

1. **Avoid `any`**: Use specific types or `unknown` when type is truly unknown
2. **Create Interfaces**: Define explicit interfaces for component props
3. **Use Generics Carefully**: Only when truly needed (like reusable utilities)
4. **Type Event Handlers**: Define event payload types for custom events
5. **Strict Mode**: Consider enabling `strict: true` in `tsconfig.json`

## Files Modified

- `components/SettingsWindow.tsx` - Fixed Select component and updateSetting function types
