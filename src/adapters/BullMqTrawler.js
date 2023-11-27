import { Queue, Worker } from 'bullmq';
// import Redis from 'ioredis';
import Trawler from '../classes/Trawler.js'

class BullMqTrawler extends Trawler {
  constructor(relays, options) {
    super(relays, options)
    this.$q = {}
    this.opts()
  }

  queue_init(){
    let queueOpts 
    if(this.options.queueOptions.$instance) {
      this.$q = this.options.queueOptions.$instance
    }
    else {
      queueOpts = { ...this.options.queueOptions, connection: this.options.adapterOptions.redis }
      this.$q.queue = new Queue(this.options.queueName, queueOpts)
    }
    this.$q.queue.on('active',      (...args) => this._on('queue_active',     ...args).catch(console.error))
    this.$q.queue.on('completed',   (...args) => this._on('queue_completed',  ...args).catch(console.error))
    this.$q.queue.on('failed',      (...args) => this._on('queue_failed',     ...args).catch(console.error))
    this.$q.queue.on('progress',    (...args) => this._on('queue_progress',   ...args).catch(console.error))
    this.$q.queue.on('waiting',     (...args) => this._on('queue_waiting',    ...args).catch(console.error))
    this.$q.queue.on('drained',     (...args) => this._on('queue_drained',    ...args).catch(console.error))  
    this.$q.queue.on('cleaned',     (...args) => this._on('queue_cleaned',    ...args).catch(console.error))
  }

  worker_init(){
    this.$q.worker = new Worker(this.$q.name, async $job =>  await this.trawl($job.data.chunk, $job), this.options.workerOptions)  
    
    this.$q.worker.on('active',     (...args) => this._on('worker_active',    ...args).catch(console.error))
    this.$q.worker.on('completed',  (...args) => this._on('worker_completed', ...args).catch(console.error))
    this.$q.worker.on('failed',     (...args) => this._on('worker_failed',    ...args).catch(console.error))
    this.$q.worker.on('progress',   (...args) => this._on('worker_progress',  ...args).catch(console.error))
    this.$q.worker.on('waiting',    (...args) => this._on('worker_waiting',   ...args).catch(console.error))
    this.$q.worker.on('drained',    (...args) => this._on('worker_drained',   ...args).catch(console.error))
    this.$q.worker.on('cleaned',    (...args) => this._on('worker_cleaned',   ...args).catch(console.error))
  }

  opts(){
    this.adapterDefaults = {
      connection: {
        host: '127.0.0.1',
        port: 6379,
        db: 0
      } 
    }
    this.adapterOptions = { ...this.adapterDefaults, ...this.options.adapterOptions }

    this.queueDefaults = { $instance: null }
    this.queueOptions = { ...this.queueDefaults, ...this.options.queueOptions, connection: this.options.adapterOptions.redis }

    this.workerDefaults = {
      removeOnComplete: true,
      removeOnFail: true
    }
    this.workerOptions = { ...this.workerDefaults, ...this.options.workerOptions, connection: this.options.adapterOptions.redis, concurrency: 1 }
  }

  async init(){
    this.queue_init()
  }

  async updateProgress(progress, $job){
    await $job.updateProgress(progress)
  }

  async addJob(index, chunk){
    return this.$q.queue.add(`chunk #${index}`, { chunk })
  }

  async pause(){
    await this.$q.queue.pause()
  }

  async resume(){
    await this.$q.queue.resume()
  }

  async clean(){
    await this.$q.queue.clean(0, 0, 'completed')
  }

  async close(){
    await this.$q.queue.close()
    await this.$q.worker.close()
  }

  queueApi(key, ...args){
    if(!(this.$q.queue?.[key] instanceof Function))
      return 
    return this.$q.queue?.[key](...args)
  }
  
  jobApi(key, ...args){
    if(!(this.$q.worker?.[key] instanceof Function))
      return
    return this.$q.worker?.[key](...args)
  }
}

export default BullMqTrawler
