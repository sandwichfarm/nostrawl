> early alpha. the example works, but no tests are written yet. Also the PQueueAdapter is not yet implemented. Also, not yet on npm so those install instructions don't work.
# nostrawl 
> Trawl [/trɔːl/] 
> 1. an act of fishing with a trawl net or seine.
> 2. a thorough search.

`nostrawl` is a simple tool for persistently fetching and processing filtered events from a set of [nostr](https://github.com/nostr-protocol/) relays.

`nostrawl` is a wrapper for `nostr-fetch` (with the `nostr-tools` simple-pool adapter) and implements adapters for queuing fetch jobs. 

## Install
```
git clone https://github.com/sandwichfarm/nostrawl
cd nostral
yarn install
yarn link nostral
```
_npm package soon_

### Run Example

With docker
```
yarn example
```
With a local redis instance. Use defaults, or set with envvars (REDIS_HOST, REDIS_PORT, etc)
```
node examples/bullmq/index.js
```
_Note: This example is for demonstration purposes only, the example will likely hit memory limits if left running too long_

## Run Tests
_What tests?_

## Docs
I'll write docs once there are tests, both adapters are implemented and there is demand.

## Queue Adapters
- `BullMQAdapter`: Persistent queue
- `PQueueAdapter`: Ephemeral javascript queue

## Usage 

```js
import { nostrawl } from 'nostrawl'
import dotenv from 'dotenv'
dotenv.config()

const relays = ["wss://relay.damus.io","wss://nostr-pub.wellorder.net","wss://nostr.mom","wss://nostr.slothy.win","wss://global.relay.red"]

const event_ids = new Set()

const options = {
  filters: { kinds: [3] },
  adapter: 'bullmq',
  queueName: 'ContactLists',
  repeatWhenComplete: true,
  restDuration: 60*60*1000,
  strictTimestamps: true,
  relaysPerBatch: 3,
  since: Math.round(Date.now()/1000-(60*60)),
  nostrFetchOptions: {
    sort: true
  },
  adapterOptions: {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379, 
      db: process.env.REDIS_DB || 0 
    }
  },
  queueOptions: {
    removeOnComplete: true, 
    removeOnFail: true
  },
  parser: async (event) => {
    event_ids.add(event.id)
    // console.log(event.created_at)
  },
  validator: (event) => {
    if(event_ids.has(event.id))
      return false 
    return true
  } 
}

const trawler = nostrawl(relays, options)

trawler
  .on_worker('progress', (job, progress) => console.log(`[@${progress.last_timestamp}] ${progress.found} events found and ${progress.rejected} events rejected from  ${progress.relay}`))
  .on_queue('drained', () => console.log(`queue is empty`))
  .on_worker('completed', (job) => console.log(`${job.id} completed`))

trawler.run()
```
