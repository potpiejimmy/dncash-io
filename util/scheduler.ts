import * as scheduler from 'node-schedule';
import * as logging from './logging';
import * as redis from './redis';

/*
 * Scheduler with cluster support.
 * Makes sure that scheduled jobs are only run once in the cluster
 */

/**
 * Schedules a job in the cluster
 * @param name job name
 * @param spec cron-like specification
 * @param task task function to be executed
 */
export function scheduleJob(name: string, spec: string, task: ()=>void) {
    scheduler.scheduleJob(spec, fireDate => {
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
                c.quit();
                // if the same execTime was already set atomically, another cluster member is executing the job
                resolve(res != execTime);
            });
        });
        c.on('error', err => {
            c.quit();
            logging.logger.error("Jobs: Redis not ready, skipping job execution: " + name);
            resolve(false);
        });
    });
}
