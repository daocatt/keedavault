import { useState, useCallback, useRef, useEffect } from 'react';

interface DragState {
    isDragging: boolean;
    entryIds: string[];
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface UsePointerDragOptions {
    onDragStart?: (entryIds: string[]) => void;
    onDragMove?: (x: number, y: number) => void;
    onDragEnd?: (entryIds: string[], targetGroupId: string | null) => void;
    longPressDuration?: number; // Duration in ms to trigger drag (default 300ms)
}

export const usePointerDrag = (options: UsePointerDragOptions = {}) => {
    const { longPressDuration = 300 } = options; // 300ms long press by default

    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        entryIds: [],
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
    });

    const dragPreviewRef = useRef<HTMLDivElement | null>(null);
    const pendingDragRef = useRef<{ entryIds: string[]; startX: number; startY: number } | null>(null);
    const dragElementRef = useRef<Element | null>(null);
    const pointerIdRef = useRef<number | null>(null);
    const wasDraggingRef = useRef<boolean>(false); // Track if drag actually happened
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer for long press

    // Handle global pointer events - ALWAYS listen, check state in handlers
    useEffect(() => {
        const handleGlobalPointerMove = (e: PointerEvent) => {
            // Check if we're currently dragging using the state
            if (dragState.isDragging) {
                setDragState(prev => ({
                    ...prev,
                    currentX: e.clientX,
                    currentY: e.clientY,
                }));

                options.onDragMove?.(e.clientX, e.clientY);
            } else if (pendingDragRef.current) {
                // If pending but moved too much, cancel the long press
                const dx = e.clientX - pendingDragRef.current.startX;
                const dy = e.clientY - pendingDragRef.current.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // If moved more than 10px while waiting for long press, cancel
                if (distance > 10) { // Using a small threshold like 10px to allow for slight hand tremors
                    if (longPressTimerRef.current) {
                        clearTimeout(longPressTimerRef.current);
                        longPressTimerRef.current = null;
                    }
                    pendingDragRef.current = null;

                    // Release pointer capture
                    if (dragElementRef.current && pointerIdRef.current !== null) {
                        try {
                            (dragElementRef.current as Element).releasePointerCapture(pointerIdRef.current);
                        } catch (err) {
                            // Ignore - capture might already be released
                        }
                    }
                    dragElementRef.current = null;
                    pointerIdRef.current = null;
                }
            }
        };

        const handleGlobalPointerUp = (e: PointerEvent) => {
            // Clear any pending long press timer
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }

            // Cancel pending drag if it never started
            if (pendingDragRef.current) {
                pendingDragRef.current = null;
                // Release capture if we have it
                if (dragElementRef.current && pointerIdRef.current !== null) {
                    try {
                        (dragElementRef.current as Element).releasePointerCapture(pointerIdRef.current);
                    } catch (err) {
                        // Ignore - capture might already be released
                    }
                }
                dragElementRef.current = null;
                pointerIdRef.current = null;
                return;
            }

            if (!dragState.isDragging) return;

            // Detect drop target
            const element = document.elementFromPoint(e.clientX, e.clientY);
            const groupElement = element?.closest('[data-group-uuid]');
            const targetGroupId = groupElement?.getAttribute('data-group-uuid') || null;

            console.log('🎯 Drop detected at:', { x: e.clientX, y: e.clientY, element, groupElement, targetGroupId });

            // Cleanup
            document.body.classList.remove('app-dragging');
            document.body.style.userSelect = '';

            // Release pointer capture
            if (dragElementRef.current && pointerIdRef.current !== null) {
                try {
                    (dragElementRef.current as Element).releasePointerCapture(pointerIdRef.current);
                } catch (err) {
                    // Ignore - capture might already be released
                }
            }
            dragElementRef.current = null;
            pointerIdRef.current = null;

            // Remove drag preview
            if (dragPreviewRef.current && document.body.contains(dragPreviewRef.current)) {
                document.body.removeChild(dragPreviewRef.current);
                dragPreviewRef.current = null;
            }

            // Call onDragEnd with the dragged entries and target
            options.onDragEnd?.(dragState.entryIds, targetGroupId);

            // Reset state
            setDragState({
                isDragging: false,
                entryIds: [],
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0,
            });

            // Reset wasDragging flag after a short delay to prevent click event
            setTimeout(() => {
                wasDraggingRef.current = false;
            }, 50);
        };

        // Use capture phase to ensure we get events even if they're stopped
        document.addEventListener('pointermove', handleGlobalPointerMove, { capture: true });
        document.addEventListener('pointerup', handleGlobalPointerUp, { capture: true });
        document.addEventListener('pointercancel', handleGlobalPointerUp, { capture: true });

        return () => {
            document.removeEventListener('pointermove', handleGlobalPointerMove, { capture: true });
            document.removeEventListener('pointerup', handleGlobalPointerUp, { capture: true });
            document.removeEventListener('pointercancel', handleGlobalPointerUp, { capture: true });

            // Clean up timer on unmount
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
        };
    }, [dragState.isDragging, dragState.entryIds, options]);

    const handlePointerDown = useCallback((
        e: React.PointerEvent,
        entryIds: string[]
    ) => {
        // Only respond to left mouse button
        if (e.button !== 0) return;

        // Don't start drag if clicking on interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button, input, a, [role="button"]')) {
            return;
        }

        // IMPORTANT: Clear any existing drag state first
        // This prevents issues when clicking second item after first drag
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        if (pendingDragRef.current) {
            pendingDragRef.current = null;
        }

        // If somehow still dragging from previous operation, reset
        if (dragState.isDragging) {
            console.warn('⚠️ Previous drag state not cleared, resetting');
            setDragState({
                isDragging: false,
                entryIds: [],
                startX: 0,
                startY: 0,
                currentX: 0,
                currentY: 0,
            });
            wasDraggingRef.current = false;
            return; // Don't start new drag, let state reset first
        }

        // Capture pointer to track it even if mouse moves outside
        try {
            e.currentTarget.setPointerCapture(e.pointerId);
            dragElementRef.current = e.currentTarget;
            pointerIdRef.current = e.pointerId;
        } catch (err) {
            console.warn('Failed to capture pointer:', err);
        }

        // Store pending drag info
        const startX = e.clientX;
        const startY = e.clientY;

        pendingDragRef.current = {
            entryIds,
            startX,
            startY,
        };

        // Start long press timer (300ms)
        longPressTimerRef.current = setTimeout(() => {
            // Only start drag if still pending (not cancelled by movement)
            // AND not already dragging from another operation
            if (pendingDragRef.current && !dragState.isDragging) {
                console.log('🎯 Long press detected, starting drag');

                // Start actual drag
                setDragState({
                    isDragging: true,
                    entryIds: pendingDragRef.current.entryIds,
                    startX: pendingDragRef.current.startX,
                    startY: pendingDragRef.current.startY,
                    currentX: startX,
                    currentY: startY,
                });

                wasDraggingRef.current = true;

                document.body.classList.add('app-dragging');
                document.body.style.userSelect = 'none';

                options.onDragStart?.(pendingDragRef.current.entryIds);
                pendingDragRef.current = null;
                longPressTimerRef.current = null;
            } else if (dragState.isDragging) {
                console.warn('⚠️ Timer fired but already dragging, ignoring');
                longPressTimerRef.current = null;
            }
        }, longPressDuration);

        // Don't prevent default here - let clicks work normally
        // Text selection will be prevented when drag actually starts
    }, [dragState, options, longPressDuration]);

    // These are now no-ops since we use global event handlers
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        // Handled globally
    }, []);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        // Handled globally
    }, []);

    const createDragPreview = useCallback((content: React.ReactNode) => {
        // Remove old preview
        if (dragPreviewRef.current && document.body.contains(dragPreviewRef.current)) {
            document.body.removeChild(dragPreviewRef.current);
        }

        // Create new preview
        const preview = document.createElement('div');
        preview.style.position = 'fixed';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = '10000';
        preview.style.opacity = '0.8';

        document.body.appendChild(preview);
        dragPreviewRef.current = preview;

        return preview;
    }, []);

    return {
        dragState,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
        createDragPreview,
        dragPreviewRef,
        wasDragging: () => wasDraggingRef.current,
    };
};
