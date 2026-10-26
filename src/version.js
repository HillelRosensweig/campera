const FALLBACK = "dev";

export async function loadVersion() {
  try {
    const response = await fetch("version.txt", { cache: "no-store" });
    return response.ok ? (await response.text()).trim() : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
