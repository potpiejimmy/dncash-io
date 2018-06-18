import * as logging from './logging';
import * as scheduler from './scheduler';
import * as cfg from '../config';
import * as db from './db';

export function scheduleJobs() {

    logging.logger.info("Scheduling DB cleanup jobs");

    // Run DB cleanup every day at 1 a.m.
    scheduler.scheduleJob("dbcleanup", "0 0 1 * * *", cleanupDatabase);
}

/**
 * Clean up the database.
 */
function cleanupDatabase() {
    let histDay = new Date();
    histDay.setDate(histDay.getDate() - cfg.MAX_HISTORY_DAYS);

    cleanupDbTable("journal", histDay).then(() =>
    cleanupDbTable("clearing", histDay).then(() =>
    cleanupDbTable("token", histDay).then(() => {
        logging.logger.info("Database cleanup successful");
    })));
}

function cleanupDbTable(tableName: string, histDay: Date): Promise<void> {
    return db.querySingle("delete from " + tableName + " where created<?", [histDay]).then(res => {
        logging.logger.info("Cleaned up " + res.affectedRows + " entries from table " + tableName);
    });
}
