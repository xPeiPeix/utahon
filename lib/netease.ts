const NETEASE_API_BASE = "https://music.163.com/api";

const DEFAULT_HEADERS = {
  "Content-Type": "application/x-www-form-urlencoded",
  Referer: "https://music.163.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

type NeteaseArtist = { id: number; name: string };
type NeteaseAlbum = { id: number; name: string };

type NeteaseSong = {
  id: number;
  name: string;
  ar?: NeteaseArtist[];
  artists?: NeteaseArtist[];
  al?: NeteaseAlbum;
  album?: NeteaseAlbum;
};

type NeteasePlaylistDetailResp = {
  code: number;
  message?: string;
  msg?: string;
  playlist?: {
    id: number;
    name: string;
    trackIds?: Array<{ id: number }>;
    tracks?: NeteaseSong[];
  };
};

type NeteaseSongDetailResp = {
  code: number;
  songs?: NeteaseSong[];
};

export type NeteaseTrack = {
  id: number;
  title: string;
  artist: string;
  album: string;
};

export type NeteasePlaylist = {
  playlistId: number;
  playlistName: string;
  tracks: NeteaseTrack[];
};

function extractArtist(song: NeteaseSong): string {
  const list = song.ar ?? song.artists ?? [];
  return list
    .map((a) => a?.name)
    .filter((n): n is string => Boolean(n))
    .join(", ");
}

function toTrack(song: NeteaseSong): NeteaseTrack {
  const album = song.al ?? song.album;
  return {
    id: song.id,
    title: song.name ?? "",
    artist: extractArtist(song),
    album: album?.name ?? "",
  };
}

async function resolvePlaylistId(input: string): Promise<number> {
  const trimmed = input.trim();

  const shortMatch = trimmed.match(/163cn\.tv\/[A-Za-z0-9]+/);
  if (shortMatch) {
    const shortUrl = `https://${shortMatch[0]}`;
    try {
      const res = await fetch(shortUrl, {
        redirect: "follow",
        headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] },
      });
      const idFromFinal = res.url.match(/[?&#/]id=(\d+)/);
      if (idFromFinal) return Number(idFromFinal[1]);
      const text = await res.text();
      const idFromBody = text.match(/playlist[?&#/]id=(\d+)/);
      if (idFromBody) return Number(idFromBody[1]);
    } catch {
      // fall through
    }
    throw new Error("短链解析失败 · 请粘贴完整 URL");
  }

  const idMatch = trimmed.match(/[?&#/]id=(\d+)/);
  if (idMatch) return Number(idMatch[1]);

  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  throw new Error("无法解析网易云歌单 URL · 需要含 playlist id");
}

async function postNetease<T>(
  path: string,
  form: Record<string, string>
): Promise<T> {
  const body = Object.entries(form)
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    )
    .join("&");

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${NETEASE_API_BASE}${path}`, {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`网易云 API HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }
  throw lastErr ?? new Error("网易云 API 请求失败");
}

async function fetchPlaylistDetail(playlistId: number): Promise<{
  name: string;
  trackIds: number[];
  firstBatch: NeteaseTrack[];
}> {
  const data = await postNetease<NeteasePlaylistDetailResp>(
    "/v6/playlist/detail",
    { id: String(playlistId), n: "1000" }
  );
  if (data.code !== 200 || !data.playlist) {
    const msg = data.message ?? data.msg ?? `code ${data.code}`;
    throw new Error(`网易云歌单获取失败: ${msg}`);
  }
  const playlist = data.playlist;
  const trackIds = (playlist.trackIds ?? []).map((t) => t.id);
  const firstBatch = (playlist.tracks ?? []).map(toTrack);
  return { name: playlist.name, trackIds, firstBatch };
}

async function fetchSongDetails(ids: number[]): Promise<NeteaseTrack[]> {
  if (ids.length === 0) return [];
  const c = JSON.stringify(ids.map((id) => ({ id })));
  const data = await postNetease<NeteaseSongDetailResp>("/v3/song/detail", {
    c,
  });
  if (data.code !== 200) {
    throw new Error(`网易云 song/detail 失败: code ${data.code}`);
  }
  return (data.songs ?? []).map(toTrack);
}

export async function fetchNeteasePlaylist(
  input: string
): Promise<NeteasePlaylist> {
  const playlistId = await resolvePlaylistId(input);
  const { name, trackIds, firstBatch } = await fetchPlaylistDetail(playlistId);

  const fetchedIds = new Set(firstBatch.map((t) => t.id));
  const missing = trackIds.filter((id) => !fetchedIds.has(id));

  const tracks: NeteaseTrack[] = [...firstBatch];
  const BATCH = 500;
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const got = await fetchSongDetails(batch);
    tracks.push(...got);
  }

  const byId = new Map<number, NeteaseTrack>();
  for (const t of tracks) byId.set(t.id, t);
  const ordered = trackIds
    .map((id) => byId.get(id))
    .filter((t): t is NeteaseTrack => Boolean(t));

  return {
    playlistId,
    playlistName: name,
    tracks: ordered.length > 0 ? ordered : tracks,
  };
}
