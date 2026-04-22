import { listVocab } from "@/lib/vocabulary";
import { ThemeToggle } from "@/components/theme-toggle";
import { VoicePicker } from "@/components/voice-picker";
import { VocabularyBody } from "@/components/vocabulary-body";
import {
  Colophon,
  DesktopNav,
  Masthead,
  MobileTopBar,
  PageFrame,
} from "@/components/editorial-shell";
import { TabBar } from "@/components/editorial-interactive";

export const dynamic = "force-dynamic";

export default function VocabularyPage() {
  const entries = listVocab();

  return (
    <PageFrame>
      <MobileTopBar
        title="語彙"
        right={
          <>
            <VoicePicker />
            <ThemeToggle />
          </>
        }
      />

      <div className="hidden md:block">
        <Masthead
          title="語彙"
          sub="Words caught in passing — a commonplace book."
          right={
            <DesktopNav
              items={[
                { href: "/", label: "Library" },
                { href: "/vocabulary", label: "Vocabulary", active: true },
                { href: "/import", label: "Import" },
              ]}
              trailing={
                <span className="flex items-center gap-2 ml-3 pl-3 border-l border-rule">
                  <VoicePicker />
                  <ThemeToggle />
                </span>
              }
            />
          }
        />
      </div>

      <VocabularyBody entries={entries} />

      <Colophon>
        <span>Vocabulary · a commonplace book</span>
        <span className="text-center">
          —— {entries.length.toString().padStart(2, "0")} entries ——
        </span>
        <span className="hidden sm:inline text-right">
          furigana · romaji · 中文 · pos
        </span>
      </Colophon>

      <TabBar />
    </PageFrame>
  );
}
