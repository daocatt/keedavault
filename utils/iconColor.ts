// Generate a consistent color for an entry based on its UUID or title
export function getEntryIconColor(entryId: string, title: string): string {
    // Use UUID if available, otherwise use title
    const seed = entryId || title;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }

    // Generate HSL color with good saturation and lightness for visibility
    const hue = Math.abs(hash % 360);
    const saturation = 70 + (Math.abs(hash >> 8) % 15); // 70-85%
    const lightness = 50 + (Math.abs(hash >> 16) % 15); // 50-65%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Get neutral color for non-colorized mode
export function getNeutralIconColor(isDark: boolean): string {
    return isDark ? '#9ca3af' : '#6b7280'; // gray-400 in dark, gray-500 in light
}
