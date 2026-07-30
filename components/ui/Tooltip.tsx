"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Tooltip({
  content,
  children,
  className = "",
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ x: r.left + r.width / 2, y: r.top });
    setVisible(true);
  };

  const hide = () => setVisible(false);

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={`inline-flex ${className}`}
      >
        {children}
      </span>
      {visible && typeof window !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: "fixed",
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, calc(-100% - 8px))",
            }}
            className="z-[100] pointer-events-none w-max max-w-xs px-3 py-2 rounded-md bg-foreground text-background text-xs font-medium leading-relaxed shadow-lg"
          >
            {content}
            <span
              aria-hidden
              className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 rotate-45 bg-foreground"
            />
          </div>,
          document.body,
        )}
    </>
  );
}
