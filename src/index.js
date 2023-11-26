import PQueueTrawler from '/adapters/PQueueTrawler.js';
import BullMqTrawler from './adaters/BullMqTrawler.js';  

trawlNostr = (relays, options) => {
  const adapter = options.adapter || 'bullmq'
  switch (adapter) {
    case 'bullmq':
      return new BullMqTrawler(relays, options)
    case 'pqueue':
    default:
      return new PQueueTrawler(relays, options)
  }
}