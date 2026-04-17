"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PrelineScript() {
  const path = usePathname();

  useEffect(() => {
    import("preline").then(() => {
      const methods = (window as Window & { HSStaticMethods?: { autoInit: () => void } }).HSStaticMethods;
      console.log("[Preline] autoInit", path);
      methods?.autoInit();
    });
  }, [path]);

  return null;
}
