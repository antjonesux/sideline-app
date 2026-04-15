import FilmCsvImportClient from "./FilmCsvImportClient";

export default async function FilmCsvImportPage({
  searchParams,
}: {
  searchParams: Promise<{ game_session_id?: string | string[] }>;
}) {
  const sp = await searchParams;
  const raw = sp.game_session_id;
  const initialAttachSessionId =
    typeof raw === "string" ? raw : Array.isArray(raw) && raw[0] ? String(raw[0]) : null;

  return <FilmCsvImportClient initialAttachSessionId={initialAttachSessionId} />;
}
