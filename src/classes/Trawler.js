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

  async _on(key, ...args){
    if(this.cb?.[key])
      this.cb[key](...args)
    if(this?.[`handle_${key}`] && typeof this?.[`handle_${key}`] === 'function')
      this?.[`handle_${key}`](...args)
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

  handle_worker_drained($job, result){
    console.log(`queue drained`)
    if(this.options?.repeatWhenComplete) {
      console.log(`Resting for ${Math.round(this.options?.restDuration/1000)} seconds and picking up where we left off`)
      setTimeout( () => this.run(), this.options?.restDuration )
    }
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