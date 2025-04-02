import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PQueueAdapter from './PQueueAdapter';
import { TrawlerOptions } from '../types';
import PQueue from 'p-queue';

// Mock PQueue
vi.mock('p-queue', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn().mockReturnThis(),
    add: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    clear: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

describe('PQueueAdapter', () => {
  let adapter: PQueueAdapter;
  const relays = ['wss://relay1.com', 'wss://relay2.com'];
  const options: TrawlerOptions = {
    queueName: 'testQueue',
    repeatWhenComplete: true,
    restDuration: 1000,
    cache: {
      enabled: true,
      path: './cache'
    }
  };

  beforeEach(() => {
    adapter = new PQueueAdapter(relays, options);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with the correct options', () => {
    expect(adapter).toBeDefined();
    expect(PQueue).toHaveBeenCalledWith(expect.objectContaining({
      concurrency: 1,
      autoStart: true
    }));
    expect(adapter['options']).toEqual(expect.objectContaining(options));
  });

  it('should set up event listeners in init', async () => {
    const queue = adapter['queue'];
    const onSpy = vi.spyOn(queue, 'on');
    
    await adapter.init();
    
    expect(onSpy).toHaveBeenCalledWith('add', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('completed', expect.any(Function));
    expect(onSpy).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should run the trawler with the correct flow', async () => {
    const startSpy = vi.spyOn(adapter as any, 'start');
    const chunkRelaysSpy = vi.spyOn(adapter as any, 'chunk_relays');
    const addJobSpy = vi.spyOn(adapter as any, 'addJob');
    
    await adapter.run();
    
    expect(startSpy).toHaveBeenCalled();
    expect(chunkRelaysSpy).toHaveBeenCalled();
    expect(addJobSpy).toHaveBeenCalled();
  });

  it('should add jobs to the queue', async () => {
    const queue = adapter['queue'];
    const addSpy = vi.spyOn(queue, 'add');
    
    await adapter['addJob'](0, ['wss://relay1.com']);
    
    expect(addSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should handle queue operations correctly', () => {
    const queue = adapter['queue'];
    const pauseSpy = vi.spyOn(queue, 'pause');
    const clearSpy = vi.spyOn(queue, 'clear');
    const startSpy = vi.spyOn(queue, 'start');
    
    adapter.pause();
    expect(pauseSpy).toHaveBeenCalled();
    
    adapter.clear();
    expect(clearSpy).toHaveBeenCalled();
    
    adapter.start();
    expect(startSpy).toHaveBeenCalled();
  });

  it('should update progress correctly', async () => {
    const _onSpy = vi.spyOn(adapter as any, '_on');
    const progress = {
      found: 5,
      rejected: 0,
      relay: 'wss://relay1.com',
      last_timestamp: 1234567890,
      total: 10
    };
    
    await adapter.updateProgress(progress, { id: 1 });
    
    expect(_onSpy).toHaveBeenCalledWith('progress', expect.objectContaining({
      found: 5,
      jobId: 1
    }));
  });
});
