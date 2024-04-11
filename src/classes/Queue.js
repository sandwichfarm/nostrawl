import NTTrawler from './Trawler.js'

class NTQueue extends NTTrawler {
  constructor(relays, options) {
    super(relays, options)
    this.$q = null
    this.queue 
    this.worker
    this.cb = {}
    this.since = {}
    this.repeatTimeout = null
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

  async handle_queue_drained($job, result){
    const timeoutExists = this.repeatTimeout && !this.repeatTimeout._destroyed
    if(this.options?.repeatWhenComplete && !timeoutExists) {
      console.log(`Resting for ${Math.round(this.options?.restDuration/1000)} seconds and then picking up where we left off`)
      this.repeatTimeout = setTimeout( () => this.run(), this.options?.restDuration )
    }
  }

  addFirstJob(fn, target){
    
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

export default NTQueue