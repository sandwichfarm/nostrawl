import PQueueTrawler from './adapters/PQueueTrawler.js';
import BullMqTrawler from './adapters/BullMqTrawler.js';  

export const createTrawler = (relays, options) => {
  const adapter = options.adapter || 'bullmq'
  switch (adapter) {
    case 'bullmq':
      return new BullMqTrawler(relays, options)
    case 'pqueue':
    default:
      return new PQueueTrawler(relays, options)
  }
}