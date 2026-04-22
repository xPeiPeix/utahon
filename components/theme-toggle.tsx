"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "./editorial-interactive";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <IconButton
      aria-label={isDark ? "切换到亮色" : "切换到暗色"}
      title={isDark ? "切换到亮色" : "切换到暗色"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {!mounted ? (
        <span className="w-[14px] h-[14px]" />
      ) : isDark ? (
        <Sun className="w-[14px] h-[14px]" strokeWidth={1.5} />
      ) : (
        <Moon className="w-[14px] h-[14px]" strokeWidth={1.5} />
      )}
    </IconButton>
  );
}
