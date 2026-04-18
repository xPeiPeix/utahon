export async function deleteSongRequest(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/songs/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
