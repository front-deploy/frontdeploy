"use client";

import { useEffect, useRef, useMemo } from "react";

export function useIntersectionObserver(
  options?: IntersectionObserverInit
) {
  const elementsRef = useRef<(Element | null)[]>([]);

  const opts = useMemo(
    () => ({
      threshold: 0.1,
      rootMargin: "0px 0px -40px 0px",
      ...options,
    }),
    [options]
  );

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, opts);

    const elements = elementsRef.current;
    elements.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      elements.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [opts]);

  const addElement = (el: Element | null) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
    }
  };

  return { addElement };
}
