class NTTrawler extends NTFetcher {
  constructor(relays, options) {
    super(relays, options)
    this.$q = null
    this.queue 
    this.worker
    this.since = {}
  }
  
  getLastSync(relay){
    if(this.config instanceof Number)
      return this.config
    else if(this.since?.[relay])
      return this.since[relay]
    else if(this.config instanceof Object)
      if(this.config?.[relay])
        return this.config[relay]
      else
        return 0
  }

  on(key, callback){
    this.cb[key] = callback
  }

  on_queue(key, data){
    this.on(`queue_${key}`, data)
  }

  on_job(key, data){
    this.on(`job_${key}`, data)
  }

  _on(key, data){
    if(this.cb?.[key])
      this.cb[key](data)
  }

  updateLastSync(key, timestamp){
    this.since[key] = timestamp
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