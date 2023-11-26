import NTFetcher from './Fetcher.js'

class NTTrawler extends NTFetcher {
  constructor(relays, options) {
    super(relays, options)
    this.$q = null
    this.queue 
    this.worker
    this.cb = {}
    this.since = {}
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

  setSince(key, timestamp){
    this.since[key] = timestamp
  }

  on(key, callback){
    this.cb[key] = callback
    return this
  }

  on_queue(key, data){
    this.on(`queue_${key}`, data)
    return this
  }

  on_worker(key, data){
    this.on(`job_${key}`, data)
    return this
  }

  _on(key, data){
    if(this.cb?.[key])
      this.cb[key](data)
  }


  addFirstJob(fn, target){
    
  }

  addJob(relay, fn){
    this.promises.push()
  }

  pause(key){
    this.$q.pause(key)
  }

  clear(key){
    this.$q.clear(key)
  }

  start(key){
    this.$q.start(key)
  }

  stop(key){
    this.$q.stop(key)
  }
}

export default NTTrawler