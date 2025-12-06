import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDropTargetOptions {
    groupUuid: string;
    onDrop?: (entryIds: string[], groupUuid: string) => void;
}

export const useDropTarget = (options: UseDropTargetOptions) => {
    const [isHovered, setIsHovered] = useState(false);
    const wasHoveredRef = useRef(false);

    // Listen for global drag state and check if this target is being hovered
    useEffect(() => {
        const checkHover = (e: PointerEvent) => {
            // Check if we're in drag mode
            if (!document.body.classList.contains('app-dragging')) {
                if (wasHoveredRef.current) {
                    setIsHovered(false);
                    wasHoveredRef.current = false;
                }
                return;
            }

            // Check if pointer is over this group's element
            const element = document.elementFromPoint(e.clientX, e.clientY);
            const groupElement = element?.closest('[data-group-uuid]');
            const hoveredGroupId = groupElement?.getAttribute('data-group-uuid');

            const nowHovered = hoveredGroupId === options.groupUuid;

            if (nowHovered !== wasHoveredRef.current) {
                wasHoveredRef.current = nowHovered;
                setIsHovered(nowHovered);

                if (nowHovered) {
                    console.log('🟢 Hovering over group:', options.groupUuid);
                }
            }
        };

        const handlePointerUp = (e: PointerEvent) => {
            // Reset hover state on pointer up
            if (wasHoveredRef.current) {
                setIsHovered(false);
                wasHoveredRef.current = false;
            }
        };

        // Use capture phase to get events before other handlers
        document.addEventListener('pointermove', checkHover, { capture: true });
        document.addEventListener('pointerup', handlePointerUp, { capture: true });
        document.addEventListener('pointercancel', handlePointerUp, { capture: true });

        return () => {
            document.removeEventListener('pointermove', checkHover, { capture: true });
            document.removeEventListener('pointerup', handlePointerUp, { capture: true });
            document.removeEventListener('pointercancel', handlePointerUp, { capture: true });
        };
    }, [options.groupUuid]);

    return {
        isHovered,
        setIsHovered,
    };
};
