import "websocket-polyfill";
import { NostrFetcher } from 'nostr-fetch';
import { SimplePool } from 'nostr-tools';
import { simplePoolAdapter } from '@nostr-fetch/adapter-nostr-tools'

class NTTrawler {
  constructor(relays, options) {
    this.relays = relays
    this.promises = []
    this.defaults = {
      queueName: 'trawlerQueue',
      repeatWhenComplete: false,
      relaysPerBatch: 5,
      restDuration: 60*1000,
      progressEvery: 1000,
      parser: () => {},
      filters: {},
      since: 0,
      sinceStrict: true,
      adapter: 'pqueue',
      nostrFetcherOptions: { sort: true },
      adapterOptions: {},
      workerOptions: {},
      queueOptions: {}
    }
    this.options = {...this.defaults, ...options}
  }

  async run(){
    let i=0
    for (const chunk of this.chunk_relays()) {
      const $job = await this.addJob(i, chunk)
      i++
    }
    this.resume()
  }

  async trawl(chunk, $job){
    console.log(`starting job #${$job.id} with ${chunk.length} relays`)
    const promises = chunk.map((relay, index) => new Promise(async (resolve) => {
      try {
        const pool = new SimplePool()
        const fetcher = NostrFetcher.withCustomPool(simplePoolAdapter(pool))
        const since = this.getSince(relay)
        const progress = {
          found: 0,
          rejected: 0,
          last_timestamp: 0,
          relay: relay
        }
        let lastProgressUpdate = 0
    
        const it = fetcher.allEventsIterator(
          [ relay ],
          this.options.filters,
          { since },
          this.options.nostrFetcherOptions
        )
    
        for await (const event of it){ 
          const passedValidation = this.options?.validator ? this.options.validator(event) : true
          const doUpdateProgress = Date.now() - lastProgressUpdate > this.options.progressEvery
          progress.last_timestamp = event.created_at
          this.updateSince(relay, progress.last_timestamp)
          if(!passedValidation) {
            progress.rejected++
            if(doUpdateProgress) {
              this.updateProgress(progress, $job)
            }
            continue
          }
          await this.options.parser(event, $job)
          progress.found++
          if(doUpdateProgress){
            this.updateProgress(progress, $job)
            lastProgressUpdate = Date.now()
          }
        }
        resolve(this.getSince(relay))
      } catch (error) {
        console.error('Error', error);
        reject(error);  // Reject the promise on error
      }
    }))
    const results = await Promise.allSettled(promises);
  }

  chunk_relays(){
    if (this.relays.length === 0) 
        return [];
    const chunks = [];
    for(let i = 0; i < this.relays.length; i += this.options.relaysPerBatch){
        chunks.push(this.relays.slice(i, i + this.options.relaysPerBatch));
    }
    return chunks;
  }

  getSince(relay){
    if(typeof this.since?.[relay] === 'number')
      return this.since[relay]
    if(typeof this.options.since === 'number')
      return this.options.since
    if(typeof this.options?.since === 'object')
      if(typeof this.options.since?.[relay] === 'number')
        return this.options.since[relay]
      else
        return 0
    if(typeof this.options?.since === 'undefined')
      return 0
  }

  updateSince(key, timestamp){
    this.since[key] = timestamp
  }
}

export default NTTrawler