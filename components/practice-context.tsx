"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PracticeDataV1, PracticeRecord } from "@/types/practice";

type PracticeContextValue = {
  practice: PracticeRecord;
  saving: boolean;
  saveData: (data: PracticeDataV1) => Promise<PracticeRecord>;
  uploadAudio: (file: File) => Promise<PracticeRecord>;
};

const PracticeContext = createContext<PracticeContextValue | null>(null);

async function parseResponse(response: Response): Promise<PracticeRecord> {
  const body = (await response.json()) as PracticeRecord | { error?: string };
  if (!response.ok) {
    throw new Error("error" in body && body.error ? body.error : `HTTP ${response.status}`);
  }
  return body as PracticeRecord;
}

export function PracticeProvider({
  initialPractice,
  children,
}: {
  initialPractice: PracticeRecord;
  children: ReactNode;
}) {
  const [practice, setPractice] = useState(initialPractice);
  const [saving, setSaving] = useState(false);

  const saveData = useCallback(
    async (data: PracticeDataV1) => {
      setSaving(true);
      try {
        const response = await fetch(`/api/songs/${practice.songId}/practice`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data }),
        });
        const next = await parseResponse(response);
        setPractice(next);
        return next;
      } finally {
        setSaving(false);
      }
    },
    [practice.songId]
  );

  const uploadAudio = useCallback(
    async (file: File) => {
      setSaving(true);
      try {
        const response = await fetch(`/api/songs/${practice.songId}/practice/audio`, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        const next = await parseResponse(response);
        setPractice(next);
        return next;
      } finally {
        setSaving(false);
      }
    },
    [practice.songId]
  );

  const value = useMemo(
    () => ({ practice, saving, saveData, uploadAudio }),
    [practice, saveData, saving, uploadAudio]
  );
  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
}

export function usePractice(): PracticeContextValue {
  const context = useContext(PracticeContext);
  if (!context) throw new Error("usePractice must be used inside PracticeProvider");
  return context;
}
