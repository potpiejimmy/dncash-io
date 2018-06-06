import * as scheduler from 'node-schedule';
import * as logging from './logging';
import * as redis from './redis';

export function scheduleJobs() {

    logging.logger.info("Scheduling DB cleanup jobs");

    // Run DB cleanup every day at 1 a.m.
    scheduleJob("dbcleanup", "0 0 1 * * *", cleanupDatabase);
}

function scheduleJob(name: string, spec: string, task) {
    scheduler.scheduleJob(spec, (fireDate) => {
        // check if task is only run once in the cluster
        assertClusterSingleExecution(name, fireDate).then(execute => {
            if (execute) {
                logging.logger.info("Executing job " + name);
                task();
            } else {
                logging.logger.info("Skipping job " + name + " executed in another instance");
            }
        })
    });
}

function assertClusterSingleExecution(name: string, fireDate: Date): Promise<boolean> {
    if (!redis.isEnabled()) return Promise.resolve(true); // only one instance
    return new Promise(resolve => {
        let c = redis.createClient();
        c.on('ready', () => {
            let execTime = fireDate.getTime();
            c.getset("timer:"+name, execTime, (err,res) => {
                // if the same execTime was already set atomically, another cluster member is executing the job
                let execute = res != execTime;
                c.quit();
                resolve(execute);
            });
        });
        c.on('error', err => {
            logging.logger.error("Jobs: Redis not ready, skipping job execution: " + name);
            c.quit();
            resolve(false);
        });
    });
}

// -- actual jobs

function cleanupDatabase() {
    logging.logger.info("Database cleanup successful");
}
