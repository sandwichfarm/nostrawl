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

  _on(key, ...args){
    if(this.cb?.[key])
      this.cb[key](...args)
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
    this.on(`worker_${key}`, data)
    return this
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