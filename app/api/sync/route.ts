import { sincronizar } from "@/lib/sync";

export const maxDuration = 30;

/** Chamado pelo cron externo (cron-job.org) — protegido por CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  const qs = new URL(request.url).searchParams.get("key");
  if (secret && auth !== `Bearer ${secret}` && qs !== secret) {
    return Response.json({ erro: "não autorizado" }, { status: 401 });
  }
  const info = await sincronizar();
  return Response.json(info, { headers: { "Cache-Control": "no-store" } });
}
