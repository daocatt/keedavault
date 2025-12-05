import { useEffect, useRef, useState } from 'react';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';

interface DropTargetGroupItemProps {
    groupUuid: string;
    groupName: string;
    isRecycleBin: boolean;
    onDrop: (entryIds: string[], groupUuid: string) => Promise<void>;
    children: (isDragOver: boolean, ref: React.RefObject<HTMLDivElement>) => React.ReactNode;
}

export const DropTargetGroupItem: React.FC<DropTargetGroupItemProps> = ({
    groupUuid,
    groupName,
    isRecycleBin,
    onDrop,
    children
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            console.warn('⚠️ No element ref for group:', groupName);
            return;
        }

        console.log('🔧 Setting up drop target for:', groupName, element);

        return dropTargetForElements({
            element,
            getData: () => ({ groupUuid, groupName }),
            // canDrop: ({ source }) => {
            //     // Only accept entry drags
            //     const canDrop = source.data.type === 'entry';
            //     console.log('🔍 canDrop check for', groupName, ':', canDrop, 'source.data:', source.data);
            //     return canDrop;
            // },
            onDragEnter: () => {
                console.log('🟢 Pragmatic DRAG ENTER:', groupName);
                setIsDragOver(true);
            },
            onDragLeave: () => {
                console.log('🔴 Pragmatic DRAG LEAVE:', groupName);
                setIsDragOver(false);
            },
            onDrop: async ({ source }) => {
                console.log('🎯 Pragmatic DROP on group:', groupName);
                setIsDragOver(false);

                const entryIds = source.data.entryIds as string[];
                if (entryIds && entryIds.length > 0) {
                    await onDrop(entryIds, groupUuid);
                }
            }
        });
    }, [groupUuid, groupName, isRecycleBin, onDrop]);

    return (
        <>
            {children(isDragOver, ref)}
        </>
    );
};
