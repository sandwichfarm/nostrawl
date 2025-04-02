import { Queue, QueueEvents, Worker } from 'bullmq';
import NTQueue from '../classes/Queue.js'
import { TrawlerOptions, Progress } from '../types.js';

interface BullMQInstance {
  queue: Queue;
  worker: Worker;
}

interface BullMQTrawlerOptions extends TrawlerOptions {
  $instance?: BullMQInstance;
}

interface QueueWithMethods extends Queue {
  [key: string]: any;
}

interface WorkerWithMethods extends Worker {
  [key: string]: any;
}

class BullMqAdapter extends NTQueue {
  private adapterDefaults: any;
  private queueDefaults: any;
  private workerDefaults: any;
  protected options: BullMQTrawlerOptions = {
    queueName: 'nostr',
    adapterOptions: {},
    queueOptions: {},
    workerOptions: {}
  };

  constructor(relays: string[], options: BullMQTrawlerOptions) {
    super(relays, options);
    console.log('BullMqAdapter()');
    this.options = { ...this.options, ...options };
    this.opts(this.options);
  }

  async init(): Promise<void> {
    this.$q = {};
    await this.queue_init();
    this.worker_init();
  }

  private async queue_init(): Promise<void> {
    console.log('BullMqAdapter:init()');
    if (this.options?.$instance) {
      this.$q.queue = this.options.$instance.queue;
    } else {
      this.$q.queue = new Queue(this.options.queueName || 'nostr', this.options.queueOptions);
    }

    console.log('obliterating queue');
    await (this.$q.queue as Queue).obliterate({ force: true });
    console.log('queue obliterated');
    
    const qEvents = new QueueEvents(this.$q.queue.name, { connection: this.options.adapterOptions?.connection });
    qEvents.on('active', (...args: any[]) => this._on('queue_active', ...args).catch(console.error));
    qEvents.on('completed', (...args: any[]) => this._on('queue_completed', ...args).catch(console.error));
    qEvents.on('failed', (...args: any[]) => this._on('queue_failed', ...args).catch(console.error));
    qEvents.on('progress', (...args: any[]) => this._on('queue_progress', ...args).catch(console.error));
    qEvents.on('waiting', (...args: any[]) => this._on('queue_waiting', ...args).catch(console.error));
    qEvents.on('drained', (...args: any[]) => this._on('queue_drained', ...args).catch(console.error));
    qEvents.on('cleaned', (...args: any[]) => this._on('queue_cleaned', ...args).catch(console.error));
  }

  private worker_init(): void {
    console.log(`worker_init`)
    this.$q.worker = new Worker(this.$q.queue.name, async ($job: any) => await this.trawl($job.data.chunk, $job), this.options.workerOptions);
    this.$q.worker.on('active', (...args: any[]) => this._on('worker_active', ...args).catch(console.error));
    this.$q.worker.on('completed', (...args: any[]) => this._on('worker_completed', ...args).catch(console.error));
    this.$q.worker.on('failed', (...args: any[]) => this._on('worker_failed', ...args).catch(console.error));
    this.$q.worker.on('progress', (...args: any[]) => this._on('worker_progress', ...args).catch(console.error));
    this.$q.worker.on('waiting', (...args: any[]) => this._on('worker_waiting', ...args).catch(console.error));
    this.$q.worker.on('drained', (...args: any[]) => this._on('worker_drained', ...args).catch(console.error));
    this.$q.worker.on('cleaned', (...args: any[]) => this._on('worker_cleaned', ...args).catch(console.error));
  }

  private opts(options: BullMQTrawlerOptions): void {
    this.adapterDefaults = {
      connection: {
        host: 'localhost',
        port: 6379,
        db: 0
      }
    };

    this.options.adapterOptions = this.options.adapterOptions || {};
    this.options.queueOptions = this.options.queueOptions || {};
    this.options.workerOptions = this.options.workerOptions || {};

    if (this.options.adapterOptions.redis) {
      this.options.adapterOptions.connection = this.options.adapterOptions.redis;
      delete this.options.adapterOptions.redis;
    }
    this.options.adapterOptions = { ...this.adapterDefaults, ...this.options.adapterOptions };

    const connection = this.options?.adapterOptions?.connection || this.adapterDefaults.connection;
    
    const typedConnection = connection as { host: string; port: number; db: number };

    this.queueDefaults = {
      removeOnComplete: true,
      removeOnFail: true,
      connection: typedConnection
    };
    this.options.queueOptions = { ...this.queueDefaults, ...this.options.queueOptions };

    this.workerDefaults = {
      connection: typedConnection,
      concurrency: 1
    };
    this.options.workerOptions = { ...this.workerDefaults, ...this.options.workerOptions };
  }

  async updateProgress(progress: Progress, $job: any): Promise<void> {
    console.log(`updateProgress(${progress.found}/${progress.total})`);
    await $job.updateProgress(progress.found / progress.total * 100);
  }

  async addJob(index: number, chunk: any): Promise<any> {
    console.log(`addJob(${index})`);
    if (!this.$q?.queue) throw new Error('Queue not initialized');
    return (this.$q.queue as Queue).add(`chunk #${index}`, { chunk });
  }

  async pause(): Promise<void> {
    console.log(`pause()`);
    if (!this.$q?.queue) throw new Error('Queue not initialized');
    await (this.$q.queue as Queue).pause();
  }

  async resume(): Promise<void> {
    console.log(`resume()`);
    if (!this.$q?.queue) throw new Error('Queue not initialized');
    await (this.$q.queue as Queue).resume();
  }

  async clean(): Promise<void> {
    console.log(`clean()`);
    if (!this.$q?.queue) throw new Error('Queue not initialized');
    await (this.$q.queue as Queue).clean(0, 0, 'completed');
  }

  async close(): Promise<void> {
    console.log(`close()`);
    if (!this.$q?.queue) throw new Error('Queue not initialized');
    if (!this.$q?.worker) throw new Error('Worker not initialized');
    await (this.$q.queue as Queue).close();
    await (this.$q.worker as Worker).close();
  }

  queueApi(key: string, ...args: any[]): any {
    if (!this.$q?.queue) throw new Error('Queue not initialized');
    const queue = this.$q.queue as QueueWithMethods;
    if (!(queue[key] instanceof Function)) return;
    return queue[key](...args);
  }

  jobApi(key: string, ...args: any[]): any {
    if (!this.$q?.worker) throw new Error('Worker not initialized');
    const worker = this.$q.worker as WorkerWithMethods;
    if (!(worker[key] instanceof Function)) return;
    return worker[key](...args);
  }
}

export default BullMqAdapter;
