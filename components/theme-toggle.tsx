"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "./editorial-interactive";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle() {
  // hydration-safe mount 标记：SSR 阶段返回 false 占位，client hydration 后立刻切真值
  const mounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  const { resolvedTheme, setTheme } = useTheme();

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
