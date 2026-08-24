import { FILM_GUIDED_ONBOARDING_HEADER, isFilmRoomBetaUser } from "@/lib/featureFlags";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Gates all `/film` routes behind the Film Room beta user list.
 * Non-beta visitors redirect to `/` — no 403, no blank page.
 * Exception: guided onboarding (`?guided=1`) remains reachable so Play Sheet → Film still works.
 */
export default async function FilmLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  if (headerStore.get(FILM_GUIDED_ONBOARDING_HEADER) === "1") {
    return children;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isFilmRoomBetaUser(user?.id)) {
    redirect("/");
  }

  return children;
}
