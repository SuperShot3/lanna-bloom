export interface OpenDeliveryListItem {
  order_id: string;
  delivery_date: string | null;
  order_status: string | null;
}

export interface OpenDeliverySummary {
  total: number;
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  overdue: OpenDeliveryListItem[];
  upcoming: OpenDeliveryListItem[];
  countsByDate: Record<string, number>;
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function emptyOpenDeliverySummary(): OpenDeliverySummary {
  return {
    total: 0,
    overdueCount: 0,
    todayCount: 0,
    upcomingCount: 0,
    overdue: [],
    upcoming: [],
    countsByDate: {},
  };
}

/** Bucket paid open-pipeline rows relative to Bangkok shop `todayYmd`. */
export function bucketOpenDeliveryRows(
  rows: OpenDeliveryListItem[],
  todayYmd: string,
  total?: number
): OpenDeliverySummary {
  const countsByDate: Record<string, number> = {};
  const overdue: OpenDeliveryListItem[] = [];
  const upcoming: OpenDeliveryListItem[] = [];
  let overdueCount = 0;
  let todayCount = 0;
  let upcomingCount = 0;

  for (const row of rows) {
    const ymd = row.delivery_date?.trim() ?? '';
    const validYmd = YMD_RE.test(ymd) ? ymd : '';
    if (validYmd) {
      countsByDate[validYmd] = (countsByDate[validYmd] ?? 0) + 1;
    }
    if (!validYmd || validYmd < todayYmd) {
      overdueCount += 1;
      overdue.push(row);
    } else if (validYmd === todayYmd) {
      todayCount += 1;
    } else {
      upcomingCount += 1;
      upcoming.push(row);
    }
  }

  return {
    total: total ?? rows.length,
    overdueCount,
    todayCount,
    upcomingCount,
    overdue,
    upcoming,
    countsByDate,
  };
}
