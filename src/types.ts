import { Event } from 'nostr-tools';
import PQueue from 'p-queue';

export interface TrawlerOptions {
  queueName?: string;
  repeatWhenComplete?: boolean;
  relaysPerBatch?: number;
  restDuration?: number;
  progressEvery?: number;
  parser?: (trawler: any, event: Event, job: any) => Promise<void>;
  filters?: Record<string, any>;
  since?: number | Record<string, number>;
  sinceStrict?: boolean;
  adapter?: 'pqueue' | 'bullmq';
  nostrFetcherOptions?: {
    sort?: boolean;
    [key: string]: any;
  };
  adapterOptions?: Record<string, any>;
  workerOptions?: Record<string, any>;
  queueOptions?: Record<string, any>;
  cache?: {
    enabled: boolean;
    path: string;
  };
  validator?: (trawler: any, event: Event) => boolean;
  after_cacheOpen?: (cache: any) => void;
}

export interface Progress {
  found: number;
  rejected: number;
  last_timestamp: number;
  total: number;
  relay: string;
}

export interface QueueAdapter {
  init(): Promise<void>;
  run(): Promise<void>;
  pause(key?: string): void;
  clear(key?: string): void;
  start(key?: string): void;
  stop(key?: string): void;
  on(key: string, callback: (...args: any[]) => void): this;
  on_queue(key: string, data: any): this;
  on_worker(key: string, data: any): this;
}

export interface PQueueAdapterOptions extends TrawlerOptions {
  concurrency?: number;
  timeout?: number;
  throwOnTimeout?: boolean;
  intervalCap?: number;
  interval?: number;
  carryoverConcurrencyCount?: boolean;
  autoStart?: boolean;
  queueClass?: typeof PQueue;
} 