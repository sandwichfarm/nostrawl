import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import Trawler from '../classes/Trawler.js'

class BullMqTrawler extends Trawler {
  constructor(relays, options) {
    super(relays, options)
    this.$q = {}
    this.$q.$redis = new Redis()
    this.$q.queue = new Queue(this.config.queueName, { ...this.options.queueOptions, connection: this.options.adapterOptions.redis })
    this.$q.worker = new Worker(
      this.config.queueName, 
        async $job => this.trawl($job.data.relay, $job), 
        { ...this.options.workerOptions, connection: this.options.adapterOptions.redis }
      )  
    this.$q.queue.on('active', (...args) => this._on('queue_active', ...args))
    this.$q.queue.on('completed', (...args) => this._on('queue_completed', ...args))
    this.$q.queue.on('failed', (...args) => this._on('queue_failed', ...args))
    this.$q.queue.on('progress', (...args) => this._on('queue_progress', ...args))
    this.$q.queue.on('waiting', (...args) => this._on('queue_waiting', ...args))
    this.$q.queue.on('drained', (...args) => this._on('queue_drained', ...args))  
    this.$q.queue.on('cleaned', (...args) => this._on('queue_cleaned', ...args))

    this.$q.worker.on('active', (...args) => this._on('worker_active', ...args))
    this.$q.worker.on('completed', (...args) => this._on('worker_completed', ...args))
    this.$q.worker.on('failed', (...args) => this._on('worker_failed', ...args))
    this.$q.worker.on('progress', (...args) => this._on('worker_progress', ...args))
    this.$q.worker.on('waiting', (...args) => this._on('worker_waiting', ...args))
    this.$q.worker.on('drained', (...args) => this._on('worker_drained', ...args))
    this.$q.worker.on('cleaned', (...args) => this._on('worker_cleaned', ...args))
    this.pause()
  }

  async updateProgress($job, progress){
    await $job.updateProgress(progress)
  }

  async addJob(relay){
    await this.$q.queue.add({ relay })
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
