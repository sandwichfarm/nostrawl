> early alpha. the example works, but no tests are written yet. Also the PQueueAdapter is not yet implemented.

# nostrawl 
> Trawl [/trɔːl/] 
> 1. an act of fishing with a trawl net or seine.
> 2. a thorough search.

`nostrawl` is a simple tool for persistently fetching and processing filtered events from a set of [Nostr](https://nostr.io) relays.

`nostrawl` is a wrapper for `nostr-fetch` (with the `nostr-tools` simple-pool adapter) and implements adapters for queuing fetch jobs. 

## Install
_yarn_
```
yarn add nostrawl
```

_pnpm_
```
pnpm install nostrawl
```

_npm_
```
npm install nostrawl
```
## Example
There's an example in scripts, it requires docker. 
```
yarn example
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
import { createTrawler } from 'nostr-crawl'

const relays = [ 'wss://relay.damus.io', 'wss://relay.snort.social' ]

const event_ids = new Set()

const options = {
  filters: { kinds: [3] },
  adapter: 'bullmq',
  queueName: 'ContactLists',
  repeatWhenComplete: true,
  restDuration: 60*60*1000,
  relaysPerBatch: 3,
  nostrFetchOptions: {
    sort: true
  },
  adapterOptions: {
    redis: {
      host: 'localhost',
      port: 6379, 
      db: 0
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

const trawler = createTrawler(relays, options)

trawler
  .on_worker('completed', (job) => console.log(`${job.data.relay}: completed jobn`, 'data:', job))
  .on_worker('progress', (job, progress) => console.log(`[chunk #${progress.last_timestamp}] ${progress.relay}: ${progress.found} events found and ${progress.rejected} events rejected`))
  .on_queue('drained', () => console.log(`queue is empty`))

trawler.run()
```