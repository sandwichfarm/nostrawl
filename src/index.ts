import PQueueAdapter from './adapters/PQueueAdapter';
import BullMqAdapter from './adapters/BullMqAdapter';
import { TrawlerOptions, PQueueAdapterOptions } from './types';

const defaultOptions: TrawlerOptions = {
  queueName: 'nostr',
  repeatWhenComplete: true,
  restDuration: 1000,
  cache: {
    enabled: true,
    path: './cache'
  }
};

export const nostrawl = (relays: string[], options: Partial<TrawlerOptions> = {}) => {
  console.log('nostrawl()');
  const mergedOptions = { ...defaultOptions, ...options };
  let $adapter;
  switch (mergedOptions.adapter) {
    case 'bullmq':
      $adapter = new BullMqAdapter(relays, mergedOptions);
      $adapter.init();
      return $adapter;
    case 'pqueue':
    default:
      $adapter = new PQueueAdapter(relays, mergedOptions as PQueueAdapterOptions);
      $adapter.init();
      return $adapter;
  }
}

export * from './types';