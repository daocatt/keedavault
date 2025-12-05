import React, { useEffect, useRef } from 'react';
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { VaultEntry } from '../types';

interface DraggableEntryRowProps {
    entry: VaultEntry;
    isSelected: boolean;
    selectedEntryIds: Set<string>;
    onClick: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onMouseEnter: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    className: string;
    style: React.CSSProperties;
    children: React.ReactNode;
}

export const DraggableEntryRow: React.FC<DraggableEntryRowProps> = ({
    entry,
    isSelected,
    selectedEntryIds,
    onClick,
    onContextMenu,
    onMouseEnter,
    onMouseLeave,
    className,
    style,
    children
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        console.log('🔧 Setting up draggable for entry:', entry.title);

        return draggable({
            element,
            getInitialData: () => {
                // Determine which entries to drag
                const entriesToDrag = isSelected
                    ? Array.from(selectedEntryIds)
                    : [entry.uuid];

                console.log('🎯 Pragmatic DnD START:', entriesToDrag.length, 'entries');

                return {
                    type: 'entry',
                    entryIds: entriesToDrag,
                    entry: entry
                };
            },
            onGenerateDragPreview: ({ nativeSetDragImage }) => {
                // Create custom drag preview with first 3 columns
                const entriesToDrag = isSelected
                    ? Array.from(selectedEntryIds)
                    : [entry.uuid];

                const dragImage = document.createElement('div');
                dragImage.style.backgroundColor = 'white';
                dragImage.style.border = '1px solid #e5e7eb';
                dragImage.style.borderRadius = '6px';
                dragImage.style.padding = '8px 12px';
                dragImage.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                dragImage.style.display = 'flex';
                dragImage.style.gap = '12px';
                dragImage.style.fontSize = '12px';
                dragImage.style.alignItems = 'center';

                // Count badge if multiple entries
                if (entriesToDrag.length > 1) {
                    const badge = document.createElement('div');
                    badge.style.backgroundColor = '#6366f1';
                    badge.style.color = 'white';
                    badge.style.borderRadius = '12px';
                    badge.style.padding = '2px 8px';
                    badge.style.fontSize = '11px';
                    badge.style.fontWeight = 'bold';
                    badge.textContent = `${entriesToDrag.length}`;
                    dragImage.appendChild(badge);
                }

                // Title
                const titleDiv = document.createElement('div');
                titleDiv.style.fontWeight = '500';
                titleDiv.style.color = '#111827';
                titleDiv.style.minWidth = '120px';
                titleDiv.style.maxWidth = '150px';
                titleDiv.style.overflow = 'hidden';
                titleDiv.style.textOverflow = 'ellipsis';
                titleDiv.style.whiteSpace = 'nowrap';
                titleDiv.textContent = entry.title;
                dragImage.appendChild(titleDiv);

                // Username
                if (entry.username) {
                    const usernameDiv = document.createElement('div');
                    usernameDiv.style.color = '#6b7280';
                    usernameDiv.style.minWidth = '100px';
                    usernameDiv.style.maxWidth = '120px';
                    usernameDiv.style.overflow = 'hidden';
                    usernameDiv.style.textOverflow = 'ellipsis';
                    usernameDiv.style.whiteSpace = 'nowrap';
                    usernameDiv.textContent = entry.username;
                    dragImage.appendChild(usernameDiv);
                }

                // Email
                const email = entry.email || entry.fields?.Email;
                if (email) {
                    const emailDiv = document.createElement('div');
                    emailDiv.style.color = '#6b7280';
                    emailDiv.style.minWidth = '100px';
                    emailDiv.style.maxWidth = '140px';
                    emailDiv.style.overflow = 'hidden';
                    emailDiv.style.textOverflow = 'ellipsis';
                    emailDiv.style.whiteSpace = 'nowrap';
                    emailDiv.textContent = email;
                    dragImage.appendChild(emailDiv);
                }

                // Add to DOM temporarily (required for rendering)
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-9999px';
                dragImage.style.left = '-9999px';
                document.body.appendChild(dragImage);

                if (nativeSetDragImage) {
                    nativeSetDragImage(dragImage, 0, 0);
                }

                // Clean up after a short delay
                setTimeout(() => {
                    if (document.body.contains(dragImage)) {
                        document.body.removeChild(dragImage);
                    }
                }, 0);
            },
            onDragStart: () => {
                document.body.classList.add('app-dragging');
            },
            onDrop: () => {
                console.log('📦 Pragmatic DnD END');
                document.body.classList.remove('app-dragging');
            }
        });
    }, [entry, isSelected, selectedEntryIds]);

    return (
        <div
            ref={ref}
            onClick={onClick}
            onContextMenu={onContextMenu}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={className}
            style={style}
        >
            {children}
        </div>
    );
};
