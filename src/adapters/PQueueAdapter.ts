import PQueue from 'p-queue';
import Queue from '../classes/Queue';
import { PQueueAdapterOptions, Progress } from '../types';

export default class PQueueAdapter extends Queue {
  queue: PQueue;
  options: PQueueAdapterOptions;
  private jobCount: number = 0;

  constructor(relays: string[], options: PQueueAdapterOptions) {
    super(relays, options);
    this.options = options;
    this.queue = new PQueue({
      concurrency: options.concurrency || 1,
      timeout: options.timeout,
      throwOnTimeout: options.throwOnTimeout,
      intervalCap: options.intervalCap || 1,
      interval: options.interval || 1000,
      carryoverConcurrencyCount: options.carryoverConcurrencyCount,
      autoStart: options.autoStart ?? true
    });
  }

  async init(): Promise<void> {
    this.queue.on('active', () => {
      console.log('Queue: Job started');
      this._on('queue_active');
    });

    this.queue.on('completed', (result) => {
      console.log('Queue: Job completed', result);
      this._on('queue_completed', result);
    });

    this.queue.on('error', (error) => {
      console.error('Queue: Error occurred', error);
      this._on('queue_error', error);
    });

    this.queue.on('idle', () => {
      console.log('Queue: All jobs completed');
      this._on('queue_idle');
    });

    this.queue.on('add', () => {
      console.log('Queue: Job added');
      this._on('queue_add');
    });

    this.queue.on('next', () => {
      console.log('Queue: Next job starting');
      this._on('queue_next');
    });
  }

  async run(): Promise<void> {
    let i = 0;
    await this.openCache();
    
    // Add all jobs to the queue first
    for (const chunk of this.chunk_relays()) {
      const job = await this.addJob(i, chunk);
      i++;
    }

    // Start processing
    this.start();
  }

  async addJob(index: number, chunk: string[]): Promise<void> {
    this.jobCount++;
    return this.queue.add(async () => {
      console.log(`Processing chunk ${index} with ${chunk.length} relays`);
      await this.trawl(chunk, { id: this.jobCount });
    });
  }

  pause(key?: string): void {
    console.log('Queue: Pausing');
    this.queue.pause();
  }

  clear(key?: string): void {
    console.log('Queue: Clearing');
    this.queue.clear();
  }

  start(key?: string): void {
    console.log('Queue: Starting');
    this.queue.start();
  }

  async stop(key?: string): Promise<void> {
    console.log('Queue: Stopping');
    this.queue.pause();
    // Wait for active jobs to complete
    await this.queue.onIdle();
    this.queue.clear();
  }

  public async updateProgress(progress: Progress, $job: any): Promise<void> {
    return this._on('progress', {
      ...progress,
      jobId: $job.id,
      timestamp: new Date().toISOString(),
    });
  }
}