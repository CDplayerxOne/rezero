import { useEffect, useRef } from "react";

export function useOutsideClick<T extends HTMLDivElement>(
  callback: () => void,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Check if the click happened outside the element
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    }

    // Listen for click events on the whole page
    document.addEventListener("mousedown", handleClickOutside);

    // Clean up the listener when the component unmounts
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [callback]);

  return ref;
}
