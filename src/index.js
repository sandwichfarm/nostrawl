import PQueueTrawler from './adapters/PQueueTrawler.js';
import BullMqTrawler from './adapters/BullMqTrawler.js';  

export const nostrawl = (relays, options) => {
  const adapter = options.adapter || 'bullmq'
  let $adapter
  switch (adapter) {
    case 'bullmq':
      $adapter = new BullMqTrawler(relays, options)
      $adapter.init()
      return $adapter
    case 'pqueue':
    default:
      $adapter = new PQueueTrawler(relays, options)
      $adapter.init()
      return $adapter 
  }
}