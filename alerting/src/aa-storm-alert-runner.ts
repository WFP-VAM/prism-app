import { run } from './aa-storm-alert/worker';

console.log(`Storm alert worker started at: ${new Date().toISOString()}`);
run();
