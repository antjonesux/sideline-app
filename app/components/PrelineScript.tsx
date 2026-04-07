"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    HSStaticMethods: {
      autoInit: () => void;
    };
  }
}

export default function PrelineScript() {
  const path = usePathname();

  useEffect(() => {
    import("preline").then(() => {
      window.HSStaticMethods?.autoInit();
    });
  }, [path]);

  return null;
}
