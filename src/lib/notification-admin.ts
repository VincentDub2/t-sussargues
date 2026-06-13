import { unstable_cache } from "next/cache";

import {
  ensureNotificationCatalog,
  getNotificationDefinition,
  isNotificationEventKey,
  NOTIFICATION_EVENT_DEFINITIONS,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export const NOTIFICATION_CONFIG_CACHE_TAG = "notification-config";
export const NOTIFICATION_CONFIG_REVALIDATE_SECONDS = 60 * 60;

export const getNotificationAdminSummary = unstable_cache(
  async () => {
    await ensureNotificationCatalog();

    const events = await prisma.notificationEvent.findMany({
      select: {
        id: true,
        key: true,
        label: true,
        description: true,
        isActive: true,
        updatedAt: true,
        template: {
          select: {
            subject: true,
          },
        },
        _count: {
          select: {
            recipients: true,
          },
        },
      },
    });

    const eventsByKey = new Map(events.map((event) => [event.key, event]));
    const orderedEvents = NOTIFICATION_EVENT_DEFINITIONS.map((definition) => {
      const event = eventsByKey.get(definition.key);

      if (!event) {
        return null;
      }

      return {
        ...event,
        placeholders: definition.placeholders,
      };
    }).filter((event) => event !== null);

    const enabledCount = events.filter((event) => event.isActive).length;

    return {
      events: orderedEvents,
      totalCount: events.length,
      enabledCount,
      disabledCount: events.length - enabledCount,
    };
  },
  ["notification-admin-summary"],
  {
    revalidate: NOTIFICATION_CONFIG_REVALIDATE_SECONDS,
    tags: [NOTIFICATION_CONFIG_CACHE_TAG],
  }
);

export const getNotificationAdminEvent = unstable_cache(
  async (idOrKey: string) => {
    await ensureNotificationCatalog();

    const event = await prisma.notificationEvent.findFirst({
      where: {
        OR: [{ id: idOrKey }, { key: idOrKey }],
      },
      include: {
        template: true,
        recipients: {
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    if (!event || !isNotificationEventKey(event.key)) {
      return null;
    }

    return {
      ...event,
      placeholders: getNotificationDefinition(event.key).placeholders,
    };
  },
  ["notification-admin-event"],
  {
    revalidate: NOTIFICATION_CONFIG_REVALIDATE_SECONDS,
    tags: [NOTIFICATION_CONFIG_CACHE_TAG],
  }
);
