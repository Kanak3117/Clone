import { useLayoutEffect, useRef } from 'react';

export function useFlipList(deps: any[]) {
    const listRef = useRef<HTMLUListElement>(null);
    const prevPositions = useRef<Map<string, DOMRect>>(new Map());

    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return;

        const children = Array.from(list.children) as HTMLElement[];
        
        // Apply FLIP for elements that existed before
        children.forEach((child) => {
            const key = child.dataset.flipId;
            if (!key) return;

            const prevRect = prevPositions.current.get(key);
            const currentRect = child.getBoundingClientRect();

            if (prevRect && (prevRect.top !== currentRect.top || prevRect.left !== currentRect.left)) {
                const deltaY = prevRect.top - currentRect.top;
                const deltaX = prevRect.left - currentRect.left;

                // Invert
                child.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                child.style.transition = 'transform 0s';

                // Play
                requestAnimationFrame(() => {
                    child.style.transform = '';
                    child.style.transition = 'transform 200ms ease-out';
                });
            }

            // Save new position for next time
            prevPositions.current.set(key, currentRect);
        });
    }, deps); // run when dependencies (like the list array) change

    return listRef;
}
