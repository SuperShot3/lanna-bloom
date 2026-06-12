import 'server-only';

/** Paginate catalog reads instead of one oversized PostgREST response. */
export const CATALOG_FETCH_PAGE_SIZE = 100;

type PageRange = { from: number; to: number };

type PageResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

const RETRYABLE_FETCH_ERROR = /fetch failed|terminated|ECONNRESET|ETIMEDOUT|socket hang up/i;
const MAX_QUERY_ATTEMPTS = 3;

export function isRetryableSupabaseFetchError(message: string): boolean {
  return RETRYABLE_FETCH_ERROR.test(message);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runQueryWithRetry<T extends { error: { message: string } | null }>(
  runQuery: () => PromiseLike<T>
): Promise<T> {
  let lastResult: T | null = null;

  for (let attempt = 0; attempt < MAX_QUERY_ATTEMPTS; attempt++) {
    const result = await runQuery();
    if (!result.error) return result;

    lastResult = result;
    if (!isRetryableSupabaseFetchError(result.error.message) || attempt === MAX_QUERY_ATTEMPTS - 1) {
      return result;
    }

    await sleep(250 * (attempt + 1));
  }

  return lastResult as T;
}

export async function runSupabaseQueryWithRetry<T extends { error: { message: string } | null }>(
  runQuery: () => PromiseLike<T>
): Promise<T> {
  return runQueryWithRetry(runQuery);
}

export async function fetchAllSupabasePages(
  runPageQuery: (page: PageRange) => PromiseLike<PageResult>,
  pageSize = CATALOG_FETCH_PAGE_SIZE
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await runQueryWithRetry(() =>
      runPageQuery({ from, to: from + pageSize - 1 })
    );
    if (error) throw new Error(error.message);

    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}
