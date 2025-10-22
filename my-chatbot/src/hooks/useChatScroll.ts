import { useEffect, useRef, RefObject } from 'react';

/**
 * Custom hook that automatically scrolls a container to the bottom
 * when the dependency value changes (typically when new messages arrive)
 * 
 * @param dependency - Value to watch for changes (e.g., messages array)
 * @returns React ref to attach to the scrollable container
 * 
 * @example
 * const messages = [...];
 * const scrollRef = useChatScroll(messages);
 * return <div ref={scrollRef}>{messages.map(...)}</div>
 */

function useChatScroll<T>(dependency: T): RefObject<HTMLDivElement | null> {
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.scrollTop = ref.current.scrollHeight;
        }
    }, [dependency]);

    return ref;
}

export default useChatScroll;
