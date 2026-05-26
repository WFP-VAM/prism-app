import type {
  AnticipatoryActionAlert,
  AnticipatoryActionHazardType,
} from '../types/anticipatory-action-alerts';
import {
  findAnticipatoryActionAlerts,
  updateAnticipatoryActionAlert,
} from '../db/aa-queries';

export type AADbAdapter = {
  findAnticipatoryActionAlerts: (
    country: string,
    type: AnticipatoryActionHazardType,
  ) => Promise<AnticipatoryActionAlert[]>;
  updateAnticipatoryActionAlert: (
    id: number,
    args: {
      lastStates: Record<string, { status: string; refTime: string }>;
      lastRanAt: Date;
      lastTriggeredAt: Date | null;
    },
  ) => Promise<void>;
};

const defaultAADb: AADbAdapter = {
  findAnticipatoryActionAlerts,
  updateAnticipatoryActionAlert,
};

type WorkerParams<TPayload, TShared> = {
  country: string;
  type: AnticipatoryActionHazardType;
  overrideEmails: string[];
  prepare: () => Promise<TShared>;
  buildForAlert: (
    alert: Pick<
      AnticipatoryActionAlert,
      'id' | 'country' | 'emails' | 'prismUrl' | 'lastStates'
    >,
    context: TShared,
    isTest: boolean,
    overrideEmails: string[],
  ) => Promise<{
    payloads: TPayload[];
    updatedLastStates: Record<string, { status: string; refTime: string }>;
  }>;
  send: (payload: TPayload) => Promise<void>;
  /** Inject for tests; defaults to pg-backed queries. */
  aaDb?: AADbAdapter;
};

export async function runAAWorker<TPayload, TShared>({
  country,
  type,
  overrideEmails,
  prepare,
  buildForAlert,
  send,
  aaDb = defaultAADb,
}: WorkerParams<TPayload, TShared>) {
  const IS_TEST = overrideEmails.length > 0;

  let alerts: Array<
    Pick<
      AnticipatoryActionAlert,
      'id' | 'country' | 'emails' | 'prismUrl' | 'lastStates'
    >
  > = [];

  if (IS_TEST) {
    const prismUrl = 'https://prism.moz.wfp.org';
    alerts = [
      {
        id: 1,
        country,
        emails: overrideEmails,
        prismUrl,
        lastStates: undefined,
      },
    ];
  } else {
    alerts = await aaDb.findAnticipatoryActionAlerts(country, type);
  }

  if (!alerts.length) {
    console.error(`Error: No ${type} alert config found for ${country}`);
    return;
  }

  const context = await prepare();

  for (const alert of alerts) {
    const { payloads, updatedLastStates } = await buildForAlert(
      alert,
      context,
      IS_TEST,
      overrideEmails,
    );

    await Promise.all(payloads.map((p) => send(p)));

    if (!IS_TEST) {
      const lastRanAt = new Date();
      const lastTriggeredAt = payloads.length > 0 ? new Date() : null;
      await aaDb.updateAnticipatoryActionAlert(alert.id, {
        lastStates: updatedLastStates,
        lastRanAt,
        lastTriggeredAt,
      });
    }
  }
}
