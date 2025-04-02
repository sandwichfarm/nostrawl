import "websocket-polyfill";
import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en';
import { NostrFetcher } from 'nostr-fetch';
import { SimplePool, Event, Filter } from 'nostr-tools';
import { simplePoolAdapter } from '@nostr-fetch/adapter-nostr-tools';
import { open } from 'lmdb';
import { mergeDeepRight } from 'ramda';
import { TrawlerOptions, Progress } from '../types';
import { EventEmitter } from 'events';

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('en-US');

export default class NTTrawler extends EventEmitter {
  protected queue: any;
  protected relays: string[];
  protected promises: Promise<any>[];
  protected defaults: TrawlerOptions;
  protected options: TrawlerOptions;
  protected cache: ReturnType<typeof open> | null;

  constructor(relays: string[], options: Partial<TrawlerOptions> = {}) {
    super();
    this.queue = null;
    this.relays = relays;
    this.promises = [];
    this.defaults = {
      queueName: 'trawlerQueue',
      repeatWhenComplete: false,
      relaysPerBatch: 3,
      restDuration: 60 * 1000,
      progressEvery: 5000,
      filters: {},
      since: 0,
      sinceStrict: true,
      adapter: 'pqueue',
      nostrFetcherOptions: {},
      adapterOptions: {},
      workerOptions: {},
      queueOptions: {},
      cache: {
        enabled: true,
        path: './cache',
      },
      parser: async () => {}
    };
    this.options = mergeDeepRight(this.defaults, options) as TrawlerOptions;
    this.cache = null;
    if (this.relays.length < (this.options.relaysPerBatch ?? 3)) {
      this.options.relaysPerBatch = this.relays.length;
    }
  }

  async run(): Promise<void> {
    let i = 0;
    await this.openCache();
    this.pause();
    for (const chunk of this.chunk_relays()) {
      const $job = await this.addJob(i, chunk);
      i++;
    }
    this.resume();
  }

  async countEvents(relay: string): Promise<number> {
    if (!this.cache) return 0;
    let results = [...this.cache.getRange()];
    results = results.filter(({ key }) => typeof key === 'string' && key.startsWith(`has:`));
    return results.length;
  }

  async countTimestamps(relay: string): Promise<number> {
    if (!this.cache) return 0;
    let events = [...this.cache.getRange()];
    events = events.filter(({ key }) => typeof key === 'string' && key?.startsWith(`has:`));
    return events.length;
  }

  async openCache(): Promise<void> {
    if (!this.options.cache?.enabled || !this.options.cache?.path) return;
    this.cache = open({
      path: this.options.cache.path,
      compression: true
    });
    if (this.options?.after_cacheOpen instanceof Function) {
      this.options.after_cacheOpen(this.cache);
    }
  }

  async trawl(chunk: string[], $job: any): Promise<void> {
    const pool = new SimplePool();
    const promises = chunk.map((relay) => new Promise(async (resolve, reject) => {
      try {
        const fetcher = NostrFetcher.withCustomPool(simplePoolAdapter(pool));
        const since = this.getSince(relay);
        const progress: Progress = {
          found: 0,
          rejected: 0,
          last_timestamp: 0,
          total: await this.countEvents(relay),
          relay: relay
        };

        let lastProgressUpdate = 0;

        const it = fetcher.allEventsIterator(
          [relay],
          this.options.filters as Filter,
          { since }
        );

        for await (const event of it) {
          const passedValidation = this.options?.validator ? this.options.validator(this, event) : true;
          const doUpdateProgress = () => Date.now() - lastProgressUpdate > (this.options.progressEvery ?? 5000);
          progress.last_timestamp = event.created_at;
          this.updateSince(relay, progress.last_timestamp);
          if (!passedValidation) {
            progress.rejected++;
            if (doUpdateProgress()) {
              lastProgressUpdate = Date.now();
              progress.total = await this.countEvents(relay);
              await this.updateProgress(progress, $job);
            }
            continue;
          }

          // Emit the event and call the parser for backward compatibility
          this.emit('event', event);
          if (this.options.parser) {
            await this.options.parser(this, event, $job);
          }
          
          progress.found++;
          if (doUpdateProgress()) {
            lastProgressUpdate = Date.now();
            progress.total = await this.countEvents(relay);
            await this.updateProgress(progress, $job);
          }
        }
        resolve(this.getSince(relay));
      } catch (error) {
        console.error('Error', error);
        this.emit('error', error);
        reject(error);
      }
    }));
    await Promise.allSettled(promises);
  }

  chunk_relays(): string[][] {
    if (this.relays.length === 0) return [];
    const batchSize = this.options.relaysPerBatch ?? 3;
    if (this.relays.length <= batchSize) {
      return [this.relays];
    }
    const chunks: string[][] = [];
    for (let i = 0; i < this.relays.length; i += batchSize) {
      chunks.push(this.relays.slice(i, i + batchSize));
    }
    return chunks;
  }

  getSince(relay: string): number {
    const cached = this.cache?.get(`lastUpdate:${relay}`);
    if (typeof cached === 'number') return cached;
    if (typeof this.options.since === 'number') return this.options.since;
    if (typeof this.options.since === 'object') {
      if (typeof this.options.since[relay] === 'number') return this.options.since[relay];
      return 0;
    }
    return 0;
  }

  async updateSince(key: string, timestamp: number): Promise<void> {
    await this.cache?.put(`lastUpdate:${key}`, timestamp);
  }

  async updateProgress(progress: Progress, $job: any): Promise<void> {
    // Emit progress event
    this.emit('progress', progress);
    // Implementation for queue-specific progress updates will be handled in derived classes
  }

  pause(): void {
    // Implementation depends on the specific queue implementation
  }

  resume(): void {
    // Implementation depends on the specific queue implementation
  }

  protected async addJob(index: number, chunk: string[]): Promise<any> {
    // Implementation depends on the specific queue implementation
    return null;
  }
}