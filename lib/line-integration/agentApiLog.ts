import 'server-only';

/** Single-line JSON logs for Vercel Runtime Logs (filter: `agent.line.api`). No secrets. */

export type AgentLineApiLog = {
  scope: 'agent.line.api';
  ts: string;
  route: string;
  method: string;
  status: number;
  ms: number;
  /** POST /api/agent/line body.action */
  action?: string;
  /** LINE user id, redacted */
  lineUserId?: string;
  /** Short, safe detail (validation message, exception message) */
  error?: string;
  /** e.g. searchCatalog query length, GET pending count, POST ack count */
  extra?: Record<string, unknown>;
};

function redactLineUserId(id: string): string {
  const t = id.trim();
  if (!t) return '';
  if (t.length <= 8) return '***';
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export function logAgentApiEvent(
  partial: Omit<AgentLineApiLog, 'scope' | 'ts'> & { lineUserId?: string | null }
): void {
  const lineUserId =
    partial.lineUserId && typeof partial.lineUserId === 'string'
      ? redactLineUserId(partial.lineUserId)
      : undefined;

  const payload: Record<string, unknown> = {
    scope: 'agent.line.api' as const,
    ts: new Date().toISOString(),
    route: partial.route,
    method: partial.method,
    status: partial.status,
    ms: partial.ms,
  };
  if (partial.action) payload.action = partial.action;
  if (lineUserId) payload.lineUserId = lineUserId;
  if (partial.error) payload.error = partial.error;
  if (partial.extra && Object.keys(partial.extra).length > 0) payload.extra = partial.extra;

  console.log(JSON.stringify(payload));
}
