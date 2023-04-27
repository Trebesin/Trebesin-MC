"use strict";
import {http,HttpRequest,HttpRequestMethod} from '@minecraft/server-net';
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
        if (
            !options?.connection?.host || 
            !options?.connection?.user || 
            !options?.connection?.password || 
            !options?.server?.url || 
            !options?.server?.username || 
            !options?.server?.password
        ) {
            throw new Error('Missing required object properties!');
        } else {
            this.#options = options;
        }
    }

    /**
     * Attempts to disconnect the connection.
     * @param {number} [attempts] Maximal amount of attemps it should make to disconnect.
     */
    async disconnect(attempts = 0) {
        return new Promise(async (resolve,reject) => {
            const request = new HttpRequest(this.#options.server.url+'/sql/disconnect')
            .addHeader('password',this.#options.server.password)
            .addHeader('username',this.#options.server.username)
            .addHeader('content-type','application/json')
            .addHeader('accept','text/plain')
            .setBody('{}')
            .setMethod(HttpRequestMethod.POST)
            .setTimeout(4);
            const response = await http.request(request);
            if (response.status === 200) {
                this.#token = null;
                resolve(response);
            } else if (response.status === 400) {
                reject(response)
            } else if (attempts > 0) {
                resolve(await this.disconnect(attempts - 1));
            } else {
                resolve(response);
            }
        });
    }

    /**
     * Attempts to connect to the DB REST API.
     * @param {number} [attempts] Maximal amount of attemps it should make to connect.
     */
    async connect(attempts = 0) {
        return new Promise(async (resolve,reject) => {
            const request = new HttpRequest(this.#options.server.url+'/sql/connect')
            .addHeader('password',this.#options.server.password)
            .addHeader('username',this.#options.server.username)
            .addHeader('content-type','application/json')
            .addHeader('accept','text/plain')
            .setBody(JSON.stringify(this.#options.connection))
            .setMethod(HttpRequestMethod.POST)
            .setTimeout(4);
            const response = await http.request(request);
            if (response.status === 200) {
                logMessage('200!')
                this.#token = JSON.parse(response.body).token;
                logMessage(`${this.#token}`);
                resolve(response);
            } else if (response.status === 400) {
                logMessage('400!')
                const disconnectResponse = await this.disconnect(2);
                if (disconnectResponse.status === 200) {
                    resolve(await this.connect(attempts));
                } else {
                    reject(`Unable to disconnect existing connection to reconnect!\n[${disconnectResponse.status}] - ${disconnectResponse.body}`);
                }
            } else if (attempts > 0) {
                logMessage('New attempt!')
                resolve(await this.connect(attempts - 1));
            } else {
                logMessage('Other response!')
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
    async query(queryOptions,options = {}) {
        const reqOptions = Object.assign({fullResponse:true,attempts:0,timeout:3},options);
        return new Promise(async (resolve,reject) => {
            if (!this.#token) reject('Not Connected!');
            const request = new HttpRequest(this.#options.server.url+'/sql')
            .addHeader('token',this.#token)
            .addHeader('username',this.#options.server.username)
            .addHeader('content-type','application/json')
            .addHeader('full-response',reqOptions.fullResponse ? 'true' : 'false')
            .addHeader('accept','text/plain')
            .setBody(JSON.stringify(queryOptions))
            .setMethod(HttpRequestMethod.POST)
            .setTimeout(reqOptions.timeout);
            const response = await http.request(request);
            if (response.status === 200) {
                resolve(JSON.parse(response.body));
            } else if (response.status === 403) {
                const reConnected = await this.connect(2);
                if (reConnected.status === 200) {
                    resolve(await this.query(queryOptions,reqOptions));
                } else {
                    reject(`Token denied, unable reconnect to the database!\n[${reConnected.status}] - ${reConnected.body}`);
                }
            } else if (reqOptions.attempts > 0) {
                resolve(await this.query(queryOptions,reqOptions));
            } else {
                reject(response);
            }
        });
    }

    #options = {
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
    };

    #token = null;
}

export { DatabaseConnection }