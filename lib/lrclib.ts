const LRCLIB_BASE = "https://lrclib.net/api";
const USER_AGENT = "utahon (https://github.com/peipei-personal/utahon)";

type LrclibTrack = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string | null;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

export type LrclibResult = {
  trackName: string;
  artistName: string;
  duration: number;
  lyrics: string;
  hasTimestamps: boolean;
};

export async function fetchLrclibLyrics(params: {
  title: string;
  artist: string;
}): Promise<LrclibResult | null> {
  const title = params.title.trim();
  const artist = params.artist.trim();
  if (!title) return null;

  if (artist) {
    const direct = await tryGet(title, artist);
    if (direct) {
      const r = pickLyrics(direct);
      if (r) return r;
    }
  }

  const q = artist ? `${artist} ${title}` : title;
  const list = await trySearch(q);
  for (const candidate of list) {
    const r = pickLyrics(candidate);
    if (r) return r;
  }

  return null;
}

async function tryGet(
  trackName: string,
  artistName: string
): Promise<LrclibTrack | null> {
  const url = new URL(`${LRCLIB_BASE}/get`);
  url.searchParams.set("track_name", trackName);
  url.searchParams.set("artist_name", artistName);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`lrclib 服务返回错误 (${res.status})`);
  return (await res.json()) as LrclibTrack;
}

async function trySearch(q: string): Promise<LrclibTrack[]> {
  const url = new URL(`${LRCLIB_BASE}/search`);
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`lrclib 搜索失败 (${res.status})`);
  return (await res.json()) as LrclibTrack[];
}

function pickLyrics(track: LrclibTrack): LrclibResult | null {
  const base = {
    trackName: track.trackName,
    artistName: track.artistName,
    duration: track.duration,
  };
  if (track.syncedLyrics && track.syncedLyrics.trim()) {
    return { ...base, lyrics: track.syncedLyrics, hasTimestamps: true };
  }
  if (track.plainLyrics && track.plainLyrics.trim()) {
    return { ...base, lyrics: track.plainLyrics, hasTimestamps: false };
  }
  return null;
}
