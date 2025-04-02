import PQueue from 'p-queue';
import NTQueue from '../classes/Queue';
import { PQueueAdapterOptions } from '../types';
import { LogLevel } from '../utils/Logger';

export default class PQueueAdapter extends NTQueue {
  protected options: PQueueAdapterOptions;
  private initialized: boolean;
  private jobCount: number;

  constructor(relays: string[], options: PQueueAdapterOptions) {
    super(relays, options);
    this.options = options;
    this.initialized = false;
    this.jobCount = 0;

    // Create a child logger specific to this adapter
    this.logger = this.logger.child('pqueue');
    this.logger.debug('PQueueAdapter initialized', {
      concurrency: this.options.adapterOptions?.concurrency || 1,
      timeout: this.options.adapterOptions?.timeout,
      relays: relays.length
    });
  }

  async init(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('PQueueAdapter already initialized');
      return;
    }
    
    this.logger.info('Initializing PQueueAdapter');
    const queueOptions: any = {
      concurrency: 1,
      timeout: 30000,
      throwOnTimeout: true,
      ...this.options.adapterOptions
    };

    // Ensure intervalCap is a valid number if provided
    if (queueOptions.intervalCap !== undefined && 
        (typeof queueOptions.intervalCap !== 'number' || queueOptions.intervalCap < 1)) {
      this.logger.warn('Invalid intervalCap, must be a number >= 1. Using default.');
      delete queueOptions.intervalCap;
    }

    this.logger.debug('Creating PQueue with options', queueOptions);
    this.queue = new PQueue(queueOptions);
    
    this.$q = {
      pause: () => {
        this.logger.info('Queue: Pausing');
        this.queue.pause();
      },
      clear: () => {
        this.logger.info('Queue: Clearing');
        this.queue.clear();
      },
      start: () => {
        this.logger.info('Queue: Starting');
        this.queue.start();
      },
      stop: async () => {
        this.logger.info('Queue: Stopping');
        await this.queue.onIdle();
        this.queue.clear();
      }
    };

    // Set up event listeners for queue events
    this.queue.on('active', () => {
      this.logger.debug('Queue: Job became active');
      this._on('queue_active');
    });

    this.queue.on('completed', async (result: any) => {
      this.logger.debug('Queue: Job completed');
      await this._on('queue_completed', result);
    });

    this.queue.on('error', (error: Error) => {
      this.logger.error('Queue: Error occurred', error);
      this._on('queue_error', error);
    });

    this.queue.on('idle', () => {
      this.logger.info('Queue: Queue is idle');
      this._on('queue_idle');
    });

    this.queue.on('add', () => {
      this.logger.debug('Queue: Job added');
      this._on('queue_add');
    });

    this.queue.on('next', () => {
      this.logger.trace('Queue: Processing next job');
      this._on('queue_next');
    });

    this.initialized = true;
    this.logger.info('PQueueAdapter initialization complete');
  }

  async run(): Promise<void> {
    if (!this.initialized) {
      this.logger.warn('PQueueAdapter not initialized, initializing now');
      await this.init();
    }

    this.logger.info('Starting PQueueAdapter run');
    await this.openCache();
    
    // Add all jobs to the queue
    this.logger.debug('Adding jobs for relay chunks');
    const chunks = this.chunk_relays();
    for (let i = 0; i < chunks.length; i++) {
      await this.addJob(i, chunks[i]);
    }
    
    // Start processing the queue
    this.logger.info('Starting queue processing');
    this.start();
  }

  async addJob(index: number, chunk: string[]): Promise<void> {
    this.logger.debug(`Adding job #${index} for ${chunk.length} relays: ${chunk.join(', ')}`);
    this.jobCount++;
    
    return this.queue.add(async () => {
      this.logger.debug(`Starting job #${index} for relays: ${chunk.join(', ')}`);
      try {
        await this.trawl(chunk, { id: index });
        this.logger.debug(`Completed job #${index}`);
        return index;
      } catch (error) {
        this.logger.error(`Job #${index} failed`, error);
        throw error;
      }
    });
  }

  pause(key?: string): void {
    this.logger.info('Pausing queue');
    this.$q?.pause(key);
  }

  clear(key?: string): void {
    this.logger.info('Clearing queue');
    this.$q?.clear(key);
  }

  start(key?: string): void {
    this.logger.info('Starting queue');
    this.$q?.start(key);
  }

  async stop(key?: string): Promise<void> {
    this.logger.info('Stopping queue');
    await this.$q?.stop(key);
  }

  public async updateProgress(progress: any, $job: any): Promise<void> {
    this.logger.debug(`Progress update for job #${$job.id}`, progress);
    await this._on('progress', progress);
  }
}