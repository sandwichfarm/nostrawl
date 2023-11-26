import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import Trawler from '../classes/Trawler.js'

class BullMqTrawler extends Trawler {
  constructor(relays, options) {
    super(relays, options)
    this.$q = {}
    this.$q.$redis = new Redis()
    this.$q.queue = new Queue(this.config.queueName, { connection: this.options.connection })
    this.$q.worker = new Worker(
      this.config.queueName, 
        async $job => this.trawl($job.data.relay, $job), 
        { ...this.options.workerOptions, connection: this.options.connection }
      )  
    this.$q.queue.on('active', (data) => this._on('queue_active', data))
    this.$q.queue.on('completed', (data) => this._on('queue_completed', data))
    this.$q.queue.on('failed', (data) => this._on('queue_failed', data))
    this.$q.queue.on('progress', (data) => this._on('queue_progress', data))
    this.$q.queue.on('waiting', (data) => this._on('queue_waiting', data))
    this.$q.queue.on('drained', (data) => this._on('queue_drained', data))  
    this.$q.queue.on('cleaned', (data) => this._on('queue_cleaned', data))

    this.$q.worker.on('active', (data) => this._on('worker_active', data))
    this.$q.worker.on('completed', (data) => this._on('worker_completed', data))
    this.$q.worker.on('failed', (data) => this._on('worker_failed', data))
    this.$q.worker.on('progress', (data) => this._on('worker_progress', data))
    this.$q.worker.on('waiting', (data) => this._on('worker_waiting', data))
    this.$q.worker.on('drained', (data) => this._on('worker_drained', data))
    this.$q.worker.on('cleaned', (data) => this._on('worker_cleaned', data))
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
