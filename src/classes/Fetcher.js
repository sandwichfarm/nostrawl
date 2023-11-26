import { NostrFetcher } from 'nostr-fetch';
import { SimplePool } from 'nostr-tools';
import { simplePoolAdapter } from '@nostr-fetch/adapter-nostr-tools'

class NTFetcher {
  constructor(relays, options) {
    this.relays = relays
    super(options);
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
    if(!this.$q) this.addAdapter(LocalAdapter)
    for await (const chunk of this.chunk_relays()) {
      for await(const relay of chunk){
        this.addJob(relay)
      }
      await Promise.all(this.promises)
      this.promises = []
    }
    if(this.options.repeatWhenComplete){
      setTimeout(() => this.run(), this.options.restDuration)
    }
  }

  async trawl(relay, $job){
    const pool = new SimplePool()
    const fetcher = NostrFetcher.withCustomPool(simplePoolAdapter(pool, this.options.nostrFetcherOptions))
    const since = this.getSince(relay)
    const progress = {}
    const it = await fetcher.allEventsIterator(
      [ relay ],
      this.options.filters,
      since,
      this.options.nostrFetcherOptions
    )
    for(const event of it){ 
      if(!this.options.validator(event))
        continue
      let updateSince
      if(this.options.sequential === true) 
        updateSince = await this.options.parser(event, $job)
      else 
        updateSince = this.options.parser(event, $job)
      if(updateSince && event?.created_at)
        this.updateSince(relay, event.created_at)
    }
  }

  chunk_relays(){
    const chunks = []
    for(let i = 0; i < this.relays.length; i += this.relaysPerBatch){
      chunks.push(this.relays.slice(i, i + this.relaysPerBatch))
    }
    return chunks
  }
}

export default NTFetcher