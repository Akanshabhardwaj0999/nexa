/*
 * Forwards song searches to the iTunes Search API.
 *
 * Apple answers requests that look like they come from an iPhone with
 * a redirect to the Music app (musics://...) instead of results, so
 * search can't call Apple straight from the browser. From here the
 * request doesn't carry the visitor's user agent. Vercel's cache also
 * answers repeated searches, which keeps us under Apple's rate limit.
 */
export const config = { runtime: "edge" };

const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";

export default async function handler(request: Request) {
    const { search } = new URL(request.url);

    const response = await fetch(`${ITUNES_SEARCH_URL}${search}`, {
        headers: { "User-Agent": "Nexa/1.0" },
    });

    return new Response(response.body, {
        status: response.status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            // Cache good answers for an hour at Vercel's edge.
            "Cache-Control": response.ok
                ? "public, s-maxage=3600, stale-while-revalidate=86400"
                : "no-store",
        },
    });
}
