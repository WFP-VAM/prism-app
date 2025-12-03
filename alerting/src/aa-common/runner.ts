import { createConnection, ILike } from 'typeorm';
import { AnticipatoryActionAlerts } from '../entities/anticipatoryActionAlerts.entity';

type WorkerParams<TPayload, TShared> = {
  country: string;
  type: 'storm' | 'flood' | 'drought';
  overrideEmails: string[];
  prepare: () => Promise<TShared>;
  buildForAlert: (
    alert: Pick<
      AnticipatoryActionAlerts,
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
};

export async function runAAWorker<TPayload, TShared>({
  country,
  type,
  overrideEmails,
  prepare,
  buildForAlert,
  send,
}: WorkerParams<TPayload, TShared>) {
  const IS_TEST = overrideEmails.length > 0;

  let alerts: Array<
    Pick<
      AnticipatoryActionAlerts,
      'id' | 'country' | 'emails' | 'prismUrl' | 'lastStates'
    >
  > = [];
  let connection;
  let alertRepository;

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
    connection = await createConnection();
    alertRepository = connection.getRepository(AnticipatoryActionAlerts);
    alerts = await alertRepository.find({
      where: { country: ILike(country), type },
    });
  }

  if (!alerts.length) {
    console.error(`Error: No ${type} alert config found for ${country}`);
    if (connection) await connection.close();
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

    if (!IS_TEST && alertRepository) {
      await alertRepository.update(
        { id: alert.id },
        {
          lastStates: updatedLastStates,
          lastRanAt: new Date(),
          ...(payloads.length > 0 ? { lastTriggeredAt: new Date() } : {}),
        },
      );
    }
  }

  if (connection) {
    await connection.close();
  }
}
