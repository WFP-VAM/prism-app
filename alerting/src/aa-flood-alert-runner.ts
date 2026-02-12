import { run } from './aa-flood-alert/worker';

console.log(`Flood alert worker started at: ${new Date().toISOString()}`);
run();
