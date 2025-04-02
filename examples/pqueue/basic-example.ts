import { nostrawl } from '../../src';
import { TrawlerOptions } from '../../src/types';

/**
 * Basic example demonstrating the usage of the PQueue adapter
 * 
 * This example shows how to:
 * 1. Configure the PQueue adapter with custom options
 * 2. Set up event handlers for queue events and nostr events
 * 3. Run the trawler with the PQueue adapter
 */
async function main() {
  console.log('Starting PQueue example...');
  
  // Define the relays to trawl
  const relays = [
    'wss://relay.damus.io',
    'wss://nostr.fmt.wiz.biz',
    'wss://relay.nostr.band',
    'wss://nostr.bitcoiner.social',
    'wss://relay.nostr.info'
  ];

  console.log(`Using ${relays.length} relays:`, relays);

  // Configure the PQueue adapter options
  const options: TrawlerOptions = {
    // Specify the adapter to use
    adapter: 'pqueue',
    
    // PQueue specific options
    adapterOptions: {
      // Number of concurrent jobs
      concurrency: 2,
      
      // Timeout for each job in milliseconds
      timeout: 30000,
      
      // Cache configuration
      cache: {
        path: './cache'
      }
    },
    
    // General trawler options
    relaysPerBatch: 2,
    
    // Filter for events (only text notes)
    filters: {
      kinds: [1]
    }
  };

  console.log('Creating trawler with options:', JSON.stringify(options, null, 2));

  // Create a trawler instance with the PQueue adapter
  const trawler = nostrawl(relays, options);

  // Set up event handlers for receiving nostr events
  // This is the recommended way to handle events (easier than using parser)
  trawler.on('event', (event) => {
    console.log(event.id);
  });

  // Track progress
  trawler.on('progress', (progress) => {
    console.log(`Progress: ${progress.found} events found, ${progress.rejected} rejected from ${progress.relay}`);
  });

  // Handle errors
  trawler.on('error', (error) => {
    console.error('Error:', error);
  });

  // Queue-specific events
  trawler.on('queue_active', () => {
    console.log('Queue is active - processing jobs');
  });

  trawler.on('queue_completed', (result) => {
    console.log('Job completed successfully');
  });

  trawler.on('queue_idle', () => {
    console.log('Queue is idle - waiting for more jobs');
  });

  // Initialize and run the trawler
  try {
    console.log('Initializing trawler...');
    await trawler.init();
    console.log('Trawler initialized');
    
    console.log('Starting trawler...');
    await trawler.run();
    console.log('Trawler started');

    // Create a promise that resolves when the trawler is done or when stopped
    const trawlerPromise = new Promise<void>((resolve, reject) => {
      let isDone = false;

      const cleanup = () => {
        if (!isDone) {
          isDone = true;
          console.log('Cleaning up trawler...');
          trawler.stop();
          resolve();
        }
      };

      // Set up cleanup handlers
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

      // Handle completion
      trawler.on('queue_idle', () => {
        console.log('All jobs completed');
        cleanup();
      });

      // Handle errors
      trawler.on('error', (error) => {
        console.error('Fatal error:', error);
        cleanup();
        reject(error);
      });

      // Set a maximum runtime of 2 minutes
      setTimeout(() => {
        console.log('Maximum runtime reached (2 minutes)');
        cleanup();
      }, 2 * 60 * 1000);
    });

    // Wait for the trawler to complete
    await trawlerPromise;
    console.log('Trawler finished');

  } catch (error) {
    console.error('Error running trawler:', error);
    throw error;
  } finally {
    // Ensure cleanup
    console.log('Stopping trawler...');
    trawler.stop();
    console.log('Trawler stopped and cleaned up');
  }
}

// Run the example
console.log('Starting PQueue example script...');
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 