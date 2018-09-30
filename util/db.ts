import { IPool, IConnection, IError, createPool } from 'mysql';

var pool : IPool;

function getPool():IPool {
    if (!pool) {
        pool = createPool({
            connectionLimit : 10,
            host            : process.env.DB_HOST || 'localhost',
            user            : 'dncashio',
            password        : 'dncashio',
            database        : 'dncashio'
        });
    }
    return pool;
}

/**
 * Creates and returns a new connection from the connection pool as a promise.
 * 
 * @export
 * @returns {Promise<IConnection>}
 */
export function connection(): Promise<IConnection> {
    return new Promise((resolve, reject) => {
        getPool().getConnection((err: IError, connection: IConnection) => {
            if (err) { console.info(err); reject(err); }
            else resolve(connection);
        });
    });
}

/**
 * Performs a statement on the given connection and returns its result
 * as a promise. The connection is kept open.
 * 
 * @export
 * @param {IConnection} connection
 * @param {string} an SQL statement string
 * @param {any[]} [params=[]] query parameters
 * @returns {Promise<any>}
 */
export function query(connection: IConnection, stmt: string, params: any[] = []) : Promise<any> {
    return new Promise((resolve, reject) => {
        connection.query(stmt, params, (err,res) => {
            if (err) { console.info(err); reject(err); }
            else resolve(res);
        })
    });
}

/**
 * Performs a single DB statement, internally fetching a new connection and releasing it afterwards.
 * The result is returned as a promise.
 * 
 * @export
 * @param {string} stmt an SQL statement string
 * @param {any[]} [params=[]] query parameters
 * @returns {Promise<any>}
 */
export function querySingle(stmt: string, params: any[] = []) : Promise<any> {
    return connection().then(connection => query(connection, stmt, params).then(res => {
        connection.release();
        return res;
    }).catch(err => {
        connection.release();
        throw err;
    }));
}

/**
 * Begins a new user transaction on the given connection.
 * @param connection a connection
 */
export function beginTransaction(connection: IConnection): Promise<any> {
    return new Promise((resolve, reject) => {
        connection.beginTransaction(err => {
            if (err) { console.info(err); reject(err); }
            else resolve();
        });
    })
}

/**
 * Commits a user transaction on the given connection.
 * @param connection a connection
 */
export function commit(connection: IConnection): Promise<any> {
    return new Promise((resolve, reject) => {
        connection.commit(err => {
            if (err) { console.info(err); reject(err); }
            else resolve();
        });
    });
}

/**
 * Rolls back a user transaction on the given connection.
 * @param connection a connection
 */
export function rollback(connection: IConnection): Promise<any> {
    return new Promise(resolve => {
        connection.rollback(() => resolve());
    });
}

/**
 * Opens a new database connection with an associated transaction. Queries on the
 * connection object will be all contained in a single transaction and 
 * committed or rolled back automatically depending on the result of the passed in promise.
 * @param performer database performer
 */
export function withTransaction(performer: (IConnection) => Promise<any>): Promise<void> {
    return connection().then(connection =>
        beginTransaction(connection)
        .then(() => performer(connection))
        .then(() => commit(connection))
        .then(() => connection.release())
        .catch(err => rollback(connection).then(() => {
            connection.release()
            throw err;
        }))
    );
}
