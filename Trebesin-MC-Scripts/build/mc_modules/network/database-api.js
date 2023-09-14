"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DatabaseConnection_options, _DatabaseConnection_token;
import { http, HttpRequest, HttpRequestMethod } from '@minecraft/server-net';
import { SecretString } from '@minecraft/server-admin';
import { logMessage } from '../../plugins/debug/debug';
/**
 * Class for creating asyncronous MySql database connections using DB REST API.
 */
class DatabaseConnection {
    /**
     * Base constructor for the DB REST API connection.
     * @param {object} options Constructor options.
     * @param {object} options.connection Required object that defines options of the connection to the database following the docs of Node.js `mysql2` library.
     * @param {string} options.connection.host URL of the database.
     * @param {string} options.connection.user Username to log into the database.
     * @param {string} options.connection.password Password to log into the database.
     * @param {object} options.server Information about the DB REST API host.
     * @param {string} options.server.url URL to the DB REST API host.
     * @param {string || SecretString} options.server.username Username for logging to the DB REST API.
     * @param {string || SecretString} options.server.password Password for logging to the DB REST API.
     */
    constructor(options) {
        _DatabaseConnection_options.set(this, {
            connection: {
                host: null,
                user: null,
                password: null
            },
            server: {
                url: null,
                password: null,
                username: null
            }
        });
        _DatabaseConnection_token.set(this, null);
        if (!options?.connection?.host ||
            !options?.connection?.user ||
            !options?.connection?.password ||
            !options?.server?.url ||
            !options?.server?.username ||
            !options?.server?.password) {
            throw new Error('Missing required object properties!');
        }
        else {
            __classPrivateFieldSet(this, _DatabaseConnection_options, options, "f");
        }
    }
    /**
     * Attempts to disconnect the connection.
     * @param {number} [attempts] Maximal amount of attemps it should make to disconnect.
     */
    async disconnect(attempts = 0) {
        return new Promise(async (resolve, reject) => {
            const request = new HttpRequest(__classPrivateFieldGet(this, _DatabaseConnection_options, "f").server.url + '/sql/disconnect')
                .addHeader('password', __classPrivateFieldGet(this, _DatabaseConnection_options, "f").server.password)
                .addHeader('username', __classPrivateFieldGet(this, _DatabaseConnection_options, "f").server.username)
                .addHeader('content-type', 'application/json')
                .addHeader('accept', 'text/plain')
                .setBody('{}')
                .setMethod(HttpRequestMethod.Post)
                .setTimeout(4);
            const response = await http.request(request);
            if (response.status === 200) {
                __classPrivateFieldSet(this, _DatabaseConnection_token, null, "f");
                resolve(response);
            }
            else if (response.status === 400) {
                reject(response);
            }
            else if (attempts > 0) {
                resolve(await this.disconnect(attempts - 1));
            }
            else {
                resolve(response);
            }
        });
    }
    /**
     * Attempts to connect to the DB REST API.
     * @param {number} [attempts] Maximal amount of attemps it should make to connect.
     */
    async connect(attempts = 0) {
        return new Promise(async (resolve, reject) => {
            const request = new HttpRequest(__classPrivateFieldGet(this, _DatabaseConnection_options, "f").server.url + '/sql/connect')
                .addHeader('password', __classPrivateFieldGet(this, _DatabaseConnection_options, "f").server.password)
                .addHeader('username', __classPrivateFieldGet(this, _DatabaseConnection_options, "f").server.username)
                .addHeader('content-type', 'application/json')
                .addHeader('accept', 'text/plain')
                .setBody(JSON.stringify(__classPrivateFieldGet(this, _DatabaseConnection_options, "f").connection))
                .setMethod(HttpRequestMethod.Post)
                .setTimeout(4);
            const response = await http.request(request);
            if (response.status === 200) {
                __classPrivateFieldSet(this, _DatabaseConnection_token, JSON.parse(response.body).token, "f");
                resolve(response);
            }
            else if (response.status === 400) {
                logMessage('400!');
                const disconnectResponse = await this.disconnect(2);
                if (disconnectResponse.status === 200) {
                    resolve(await this.connect(attempts));
                }
                else {
                    reject(`Unable to disconnect existing connection to reconnect!\n[${disconnectResponse.status}] - ${disconnectResponse.body}`);
                }
            }
            else if (attempts > 0) {
                logMessage('New attempt!');
                resolve(await this.connect(attempts - 1));
            }
            else {
                logMessage('Other response!');
                resolve(response);
            }
        });
    }
    /**
     * Attempts to query the database.
     * @param {object} queryOptions Required object that defines options to query the database following the docs of Node.js `mysql2` module.
     * @param {string} queryOptions.sql SQL code used to query the database.
     * @param {number} queryOptions.timeout Amount of time to wait before the query on the database gets timed out.
     * @param {object} options
     * @param {boolean} [options.fullResponse] Decides whether the full body reponse is required or if numerical code is enough.
     * @param {number} [options.attempts] Maximal amount of attemps it should make to query the database.
     * @param {number} [options.timeout] Timeout for the request in seconds.
     */
    async query(queryOptions, options = {}) {
        const reqOptions = Object.assign({ fullResponse: true, attempts: 0, timeout: 3 }, options);
        return new Promise(async (resolve, reject) => {
            if (!__classPrivateFieldGet(this, _DatabaseConnection_token, "f"))
                reject('Not Connected!');
            const request = new HttpRequest(__classPrivateFieldGet(this, _DatabaseConnection_options, "f").server.url + '/sql')
                .addHeader('token', __classPrivateFieldGet(this, _DatabaseConnection_token, "f"))
                .addHeader('username', __classPrivateFieldGet(this, _DatabaseConnection_options, "f").server.username)
                .addHeader('content-type', 'application/json')
                .addHeader('full-response', reqOptions.fullResponse ? 'true' : 'false')
                .addHeader('accept', 'text/plain')
                .setBody(JSON.stringify(queryOptions))
                .setMethod(HttpRequestMethod.Post)
                .setTimeout(reqOptions.timeout);
            const response = await http.request(request);
            if (response.status === 200) {
                resolve(JSON.parse(response.body));
            }
            else if (response.status === 403) {
                const reConnected = await this.connect(2);
                if (reConnected.status === 200) {
                    resolve(await this.query(queryOptions, reqOptions));
                }
                else {
                    reject(`Token denied, unable reconnect to the database!\n[${reConnected.status}] - ${reConnected.body}`);
                }
            }
            else if (reqOptions.attempts > 0) {
                resolve(await this.query(queryOptions, reqOptions));
            }
            else {
                reject(response);
            }
        });
    }
}
_DatabaseConnection_options = new WeakMap(), _DatabaseConnection_token = new WeakMap();
export { DatabaseConnection };

//# sourceMappingURL=database-api.js.map
