import "websocket-polyfill";
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

import { NostrFetcher } from 'nostr-fetch';
import { SimplePool } from 'nostr-tools';
import { simplePoolAdapter } from '@nostr-fetch/adapter-nostr-tools'
import { open } from 'lmdb';

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo('en-US')

class NTTrawler {
  constructor(relays, options) {
    this.relays = relays
    this.promises = []
    this.defaults = {
      queueName: 'trawlerQueue',
      repeatWhenComplete: false,
      relaysPerBatch: 3,
      restDuration: 60*1000,
      progressEvery: 5000,
      parser: () => {},
      filters: {},
      since: 0,
      sinceStrict: true,
      adapter: 'pqueue',
      nostrFetcherOptions: { sort: true },
      adapterOptions: {},
      workerOptions: {},
      queueOptions: {},
      cache: {
        enabled: true,
        path: './cache',
      }
    }
    this.options = {...this.defaults, ...options}
    this.cache = null
  }

  async run(){
    let i=0
    this.openCache();
    for (const chunk of this.chunk_relays()) {
      const $job = await this.addJob(i, chunk)
      i++
    }
    this.resume()
  }

  async countEvents(relay){
    let results = [...this.cache.getRange()]
    if(results.length === 0) complete = true
    results = results.filter(({ key, value }) => key.startsWith(`has:`))
    return results.length
  }

  async countTimestamps(relay){
    let events = [...this.cache.getRange()]
    
    events = events.filter(({ key, value }) => key.startsWith(`has:`))
    return events.length
  }

  async openCache(){
    if(!this.options.cache.enabled || !this.options.cache?.path) return
    this.cache = open({
      path: this.options.cache.path,
      compression: true
    });
    console.log('cache opened')
  }

  async trawl(chunk, $job){
    console.log(`starting job #${$job.id} with ${chunk.length} relays`)
    const promises = chunk.map((relay, index) => new Promise(async (resolve, reject) => {
      try {
        const pool = new SimplePool()
        const fetcher = NostrFetcher.withCustomPool(simplePoolAdapter(pool))
        const since = this.getSince(relay)
        const progress = {
          found: 0,
          rejected: 0,
          last_timestamp: 0,
          total: await this.countEvents(),
          relay: relay
        }

        let lastProgressUpdate = 0

        console.log(`trawling ${relay} starting from ${timeAgo.format(new Date(since*1000))}`)
    
        const it = fetcher.allEventsIterator(
          [ relay ],
          this.options.filters,
          { since },
          this.options.nostrFetcherOptions
        )
    
        for await (const event of it){ 
          
          const passedValidation = this.options?.validator ? this.options.validator(this, event) : true
          const doUpdateProgress = () => Date.now() - lastProgressUpdate > this.options.progressEvery
          progress.last_timestamp = event.created_at
          this.updateSince(relay, progress.last_timestamp)
          if(!passedValidation) {
            progress.rejected++
            if(doUpdateProgress()) {
              lastProgressUpdate = Date.now()
              progress.total = await this.countEvents()
              this.updateProgress(progress, $job)
            }
            continue
          }
          
          await this.options.parser(this, event, $job)
          progress.found++
          if(doUpdateProgress()){
            lastProgressUpdate = Date.now()
            progress.total = await this.countEvents()
            this.updateProgress(progress, $job)
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
    const cached = this.cache.get(`lastUpdate:${relay}`)
    if(typeof cached === 'number')
      return cached
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

  async updateSince(key, timestamp){
    await this.cache.put(`lastUpdate:${key}`, timestamp)
  }
}

export default NTTrawler