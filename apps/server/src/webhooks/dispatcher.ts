import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { webhookDeliveries, webhooks } from "../db/schema.js";
import { signPayload } from "./sign.js";

const MAX_ATTEMPTS = 6;
const BACKOFF_SECONDS = [10, 30, 60, 300, 900, 3600];

/** Cria os deliveries pendentes para um evento, um por webhook ativo do projeto inscrito nesse tipo. */
export async function enqueueWebhookDeliveries(params: {
  projectId: string;
  eventType: string;
  payload: unknown;
}) {
  const activeWebhooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.projectId, params.projectId), eq(webhooks.isActive, true)));

  const targets = activeWebhooks.filter((w) => w.events.includes(params.eventType));
  if (targets.length === 0) return;

  await db.insert(webhookDeliveries).values(
    targets.map((w) => ({
      webhookId: w.id,
      eventType: params.eventType,
      payload: params.payload,
      nextRetryAt: new Date(),
    })),
  );
}

/** Processa deliveries pendentes (chamado por um loop/timer no index.ts). Sem BullMQ na Fase 1. */
export async function processDueWebhookDeliveries() {
  const due = await db
    .select({ delivery: webhookDeliveries, webhook: webhooks })
    .from(webhookDeliveries)
    .innerJoin(webhooks, eq(webhooks.id, webhookDeliveries.webhookId))
    .where(
      and(
        isNull(webhookDeliveries.deliveredAt),
        or(isNull(webhookDeliveries.nextRetryAt), lte(webhookDeliveries.nextRetryAt, new Date())),
      ),
    )
    .limit(25);

  for (const { delivery, webhook } of due) {
    const rawBody = JSON.stringify({
      event: delivery.eventType,
      data: delivery.payload,
      timestamp: new Date().toISOString(),
    });

    try {
      const res = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-annotate-signature": signPayload(webhook.secret, rawBody),
        },
        body: rawBody,
      });

      if (res.ok) {
        await db
          .update(webhookDeliveries)
          .set({ deliveredAt: new Date(), responseStatus: res.status })
          .where(eq(webhookDeliveries.id, delivery.id));
        continue;
      }
      await scheduleRetry(delivery.id, delivery.attempt, res.status);
    } catch {
      await scheduleRetry(delivery.id, delivery.attempt, null);
    }
  }
}

async function scheduleRetry(deliveryId: string, attempt: number, responseStatus: number | null) {
  if (attempt >= MAX_ATTEMPTS) {
    await db
      .update(webhookDeliveries)
      .set({ responseStatus: responseStatus ?? undefined, attempt: attempt + 1 })
      .where(eq(webhookDeliveries.id, deliveryId));
    return;
  }
  const delaySeconds = BACKOFF_SECONDS[Math.min(attempt, BACKOFF_SECONDS.length - 1)];
  await db
    .update(webhookDeliveries)
    .set({
      attempt: attempt + 1,
      responseStatus: responseStatus ?? undefined,
      nextRetryAt: new Date(Date.now() + delaySeconds * 1000),
    })
    .where(eq(webhookDeliveries.id, deliveryId));
}
