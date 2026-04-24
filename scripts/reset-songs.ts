import Database from "better-sqlite3";
import path from "path";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "utahon.db");
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const BAK_PATH = path.join(DB_DIR, `utahon.db.bak-${ts}`);

const alsoVocab = process.argv.includes("--with-vocab");

async function main() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  await db.backup(BAK_PATH);
  console.log(`[reset-songs] backup saved → ${BAK_PATH}`);

  const songsBefore = (
    db.prepare("SELECT COUNT(*) AS n FROM songs").get() as { n: number }
  ).n;
  const vocabBefore = (
    db.prepare("SELECT COUNT(*) AS n FROM vocabulary").get() as { n: number }
  ).n;

  const rSongs = db.prepare("DELETE FROM songs").run();
  let rVocabChanges = 0;
  if (alsoVocab) {
    const rVocab = db.prepare("DELETE FROM vocabulary").run();
    rVocabChanges = rVocab.changes;
  }

  console.log(
    `[reset-songs] songs deleted: ${rSongs.changes} (was ${songsBefore})`
  );
  if (alsoVocab) {
    console.log(
      `[reset-songs] vocabulary deleted: ${rVocabChanges} (was ${vocabBefore})`
    );
  } else {
    console.log(`[reset-songs] vocabulary kept: ${vocabBefore} rows`);
  }

  db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
