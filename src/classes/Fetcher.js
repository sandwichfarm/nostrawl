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
      sequential: true,
      repeatWhenComplete: false,
      relaysPerBatch: 5,
      restDuration: 60*1000,
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
      console.log(chunk)
      const $job = await this.addJob(i, chunk)
      i++
    }
    this.resume()
  }

  async trawl(chunk, $job){
    console.log(chunk)
    for (const relay of chunk){
      console.log(relay)
      console.log('here')
      const pool = new SimplePool()
      const fetcher = NostrFetcher.withCustomPool(simplePoolAdapter(pool))
      const since = this.getSince(relay)
      const progress = {
        found: 0,
        rejected: 0,
        last_timestamp: 0
      }
  
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
        if(this.options.sequential === true) 
          await this.options.parser(event, $job)
        else 
          this.options.parser(event, $job)
        if(event?.created_at)
          this.updateSince(relay, event.created_at)
        progress.found++
        progress.last_timestamp = this.getSince(relay)
        progress.relay = relay
        this.updateProgress(progress, $job)
      }
    }
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
    if(!this.options?.since)
      return 0
    if(this.options.since instanceof Number)
      return this.options.since
    else if(this.since?.[relay])
      return this.since[relay]
    else if(this.options.since instanceof Object)
      if(this.options.since?.[relay])
        return this.options.since[relay]
      else
        return 0
  }

  updateSince(key, timestamp){
    this.since[key] = timestamp
  }
}

export default NTFetcher