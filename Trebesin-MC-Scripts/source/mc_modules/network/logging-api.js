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
var _LoggingConnection_options, _LoggingConnection_token;
import { http, HttpRequest, HttpRequestMethod } from '@minecraft/server-net';
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
        _LoggingConnection_options.set(this, {
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
        _LoggingConnection_token.set(this, null);
        if (!options?.server?.url ||
            !options?.server?.username ||
            !options?.server?.password) {
            throw new Error('Missing required object properties!');
        }
        else {
            __classPrivateFieldSet(this, _LoggingConnection_options, options, "f");
        }
    }
    /**
     * Attempts to disconnect the connection.
     * @param {number} [attempts] Maximal amount of attemps it should make to disconnect.
     */
    async disconnect(attempts = 0) {
        return new Promise(async (resolve, reject) => {
            const request = new HttpRequest(__classPrivateFieldGet(this, _LoggingConnection_options, "f").server.url + '/log/disconnect')
                .addHeader('password', __classPrivateFieldGet(this, _LoggingConnection_options, "f").server.password)
                .addHeader('username', __classPrivateFieldGet(this, _LoggingConnection_options, "f").server.username)
                .addHeader('content-type', 'application/json')
                .addHeader('accept', 'text/plain')
                .setBody('{}')
                .setMethod(HttpRequestMethod.POST)
                .setTimeout(4);
            const response = await http.request(request);
            if (response.status === 200) {
                __classPrivateFieldSet(this, _LoggingConnection_token, null, "f");
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
     * Attempts to connect to the Logging REST API.
     * @param {number} [attempts] Maximal amount of attemps it should make to connect.
     */
    async connect(attempts = 0) {
        return new Promise(async (resolve, reject) => {
            const request = new HttpRequest(__classPrivateFieldGet(this, _LoggingConnection_options, "f").server.url + '/log/connect')
                .addHeader('password', __classPrivateFieldGet(this, _LoggingConnection_options, "f").server.password)
                .addHeader('username', __classPrivateFieldGet(this, _LoggingConnection_options, "f").server.username)
                .addHeader('content-type', 'application/json')
                .addHeader('accept', 'text/plain')
                .setBody('{}')
                .setMethod(HttpRequestMethod.POST)
                .setTimeout(4);
            const response = await http.request(request);
            if (response.status === 200) {
                __classPrivateFieldSet(this, _LoggingConnection_token, JSON.parse(response.body).token, "f");
                resolve(response);
            }
            else if (response.status === 400) {
                const disconnectResponse = await this.disconnect(2);
                if (disconnectResponse.status === 200) {
                    resolve(await this.connect(attempts));
                }
                else {
                    reject(`Unable to disconnect existing connection to reconnect!\n[${disconnectResponse.status}] - ${disconnectResponse.body}`);
                }
            }
            else if (attempts > 0) {
                resolve(await this.connect(attempts - 1));
            }
            else {
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
    async sendLog(message, options = {}) {
        const reqOptions = Object.assign({ attempts: 0, timeout: 3 }, options);
        return new Promise(async (resolve, reject) => {
            if (!__classPrivateFieldGet(this, _LoggingConnection_token, "f"))
                reject('Not Connected!');
            const request = new HttpRequest(__classPrivateFieldGet(this, _LoggingConnection_options, "f").server.url + '/log')
                .addHeader('token', __classPrivateFieldGet(this, _LoggingConnection_token, "f"))
                .addHeader('username', __classPrivateFieldGet(this, _LoggingConnection_options, "f").server.username)
                .addHeader('content-type', 'application/json')
                .addHeader('blank', 'true')
                .setBody(JSON.stringify({ message }))
                .setMethod(HttpRequestMethod.POST)
                .setTimeout(reqOptions.timeout);
            const response = await http.request(request);
            if (response.status === 200) {
                resolve(JSON.parse(response.body));
            }
            else if (response.status === 403) {
                const reConnected = await this.connect(2);
                if (reConnected.status === 200) {
                    resolve(await this.sendLog(message, reqOptions));
                }
                else {
                    reject(`Token denied, unable to reconnect to the log!\n[${reConnected.status}] - ${reConnected.body}`);
                }
            }
            else if (reqOptions.attempts > 0) {
                reqOptions.attempts--;
                resolve(await this.sendLog(message, reqOptions));
            }
            else {
                reject(response);
            }
        });
    }
}
_LoggingConnection_options = new WeakMap(), _LoggingConnection_token = new WeakMap();
export { LoggingConnection };

//# sourceMappingURL=logging-api.js.map
