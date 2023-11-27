import "websocket-polyfill";
import { NostrFetcher } from 'nostr-fetch';
import { SimplePool } from 'nostr-tools';
import { simplePoolAdapter } from '@nostr-fetch/adapter-nostr-tools'
import Trawler from './Trawler.js'

class NTFetcher {
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
    for await (const chunk of this.chunk_relays()) {
      const $job = await this.addJob(i, chunk)
      i++
    }
    this.resume()
  }

  async trawl(chunk, $job){
    chunk.forEach( async relay => {
      const pool = new SimplePool()
      const fetcher = NostrFetcher.withCustomPool(simplePoolAdapter(pool))
      const since = this.getSince(relay)
      const progress = {
        found: 0,
        rejected: 0,
        last_timestamp: 0
      }
      let lastProgressUpdate = 0
  
      const it = fetcher.allEventsIterator(
        [ relay ],
        this.options.filters,
        since,
        this.options.nostrFetcherOptions
      )
  
      for await (const event of it){ 
        if(!this.options.validator(event)) {
          progress.rejected++
          continue
        }
        await this.options.parser(event, $job)
        if(event?.created_at)
          this.updateSince(relay, event.created_at)
        progress.found++
        progress.last_timestamp = this.getSince(relay)
        progress.relay = relay
        if(Date.now() - lastProgressUpdate > this.options.progressEvery){
          this.updateProgress(progress, $job)
          lastProgressUpdate = Date.now()
        }
      }
    })
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

export default NTFetcher