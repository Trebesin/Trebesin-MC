import {http,HttpRequest,HttpRequestMethod} from '@minecraft/server-net';
import { SecretString } from '@minecraft/server-admin';

/**
 * Class for sending log messages using Logging REST API.
 */
class LoggingConnection {
    /**
     * Base constructor for the Logging REST API connection.
     * @param {object} options Constructor options.
     * @param {object} options.server Information about the Logging REST API host.
     * @param {string} options.server.url URL to the Logging REST API host.
     * @param {string || SecretString} options.server.username Username for logging to the Logging REST API.
     * @param {string || SecretString} options.server.password Password for logging to the Logging REST API.
     */
    constructor(options) {
        if (
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
            const request = new HttpRequest(this.#options.server.url+'/log/disconnect')
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
     * Attempts to connect to the Logging REST API.
     * @param {number} [attempts] Maximal amount of attemps it should make to connect.
     */
    async connect(attempts = 0) {
        return new Promise(async (resolve,reject) => {
            const request = new HttpRequest(this.#options.server.url+'/log/connect')
            .addHeader('password',this.#options.server.password)
            .addHeader('username',this.#options.server.username)
            .addHeader('content-type','application/json')
            .addHeader('accept','text/plain')
            .setBody('{}')
            .setMethod(HttpRequestMethod.POST)
            .setTimeout(4);
            const response = await http.request(request);
            if (response.status === 200) {
                this.#token = JSON.parse(response.body).token;
                resolve(response);
            } else if (response.status === 400) {
                const disconnectResponse = await this.disconnect(2);
                if (disconnectResponse.status === 200) {
                    resolve(await this.connect(attempts));
                } else {
                    reject(`Unable to disconnect existing connection to reconnect!\n[${disconnectResponse.status}] - ${disconnectResponse.body}`);
                }
            } else if (attempts > 0) {
                resolve(await this.connect(attempts - 1));
            } else {
                resolve(response);
            }
        });
    }
    /**
     * Attempts to log message to the API server consple.
     * @param {string} message Message that gets logged into the API server console.
     * @param {object} [options] Options
     * @param {number} [options.attempts] Maximal amount of attemps it should make to log the message.
     * @param {number} [options.timeout] Timeout for the request in seconds.
     */
    async sendLog(message,options = {}) {
        const reqOptions = Object.assign({attempts:0,timeout:3},options);
        return new Promise(async (resolve,reject) => {
            if (!this.#token) reject('Not Connected!');
            const request = new HttpRequest(this.#options.server.url+'/log')
            .addHeader('token',this.#token)
            .addHeader('username',this.#options.server.username)
            .addHeader('content-type','application/json')
            .addHeader('blank','true')
            .setBody(JSON.stringify({message}))
            .setMethod(HttpRequestMethod.POST)
            .setTimeout(reqOptions.timeout);
            const response = await http.request(request);
            if (response.status === 200) {
                resolve(JSON.parse(response.body));
            } else if (response.status === 403) {
                const reConnected = await this.connect(2);
                if (reConnected.status === 200) {
                    resolve(await this.sendLog(message,reqOptions));
                } else {
                    reject(`Token denied, unable to reconnect to the log!\n[${reConnected.status}] - ${reConnected.body}`);
                }
            } else if (reqOptions.attempts > 0) {
                reqOptions.attempts--;
                resolve(await this.sendLog(message,reqOptions));
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

export { LoggingConnection }