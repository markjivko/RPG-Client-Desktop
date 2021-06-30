/**
 * Stephino_Rpg
 *
 * @title      RPG
 * @desc       App functionality
 * @copyright  (c) 2021, Stephino
 * @author     Mark Jivko <stephino.team@gmail.com>
 * @package    stephino-rpg
 * @license    GPL v3+, https://gnu.org/licenses/gpl-3.0.txt
 */
const { net, shell, session, ipcMain, BrowserView, BrowserWindow } = require('electron');
const querystring = require('querystring');
const path = require('path');
const core = require('../../package.json');
const crypto = require('crypto');
const Store = require('electron-store');

/**
 * Export the Stephino_Rpg utilities
 */
module.exports = new (class Stephino_Rpg {
    /**
     * @type {Electron.BrowserWindow}
     */
    static _gameWindow = null;

    /**
     * @type {Electron.BrowserView}
     */
    static _browserView = null;

    /**
     * Navigator
     */
    navigate = {
        index: () => {
            this.getGameWindow().webContents.setAudioMuted(false);

            // Load the login page
            this.getGameWindow().removeBrowserView(this.getBrowserView());
            this.getGameWindow().loadFile(
                path.join(path.dirname(__dirname), 'ui/tpl/index.html')
            );
        },
        play: () => {
            const store = new Store({name: 'stephino-rpg'});
            const serverUrl = store.get("serverUrl", core.config.stephino.serverUrl);

            // Prepare the URL
            const url = new URL(serverUrl);

            // Invalid protocol
            if (!/^https\:/.test(url.protocol)) {
                throw new Error('Your website must use SSL');
            }

            // Test for dots (no localhost)
            if (!/\./.test(url.hostname)) {
                throw new Error('Invalid hostname');
            }

            // Load the game
            this.getGameWindow().setBrowserView(this.getBrowserView());
            this.getBrowserView(true).webContents.loadURL(
                `${url.protocol}//${url.hostname}/wp-admin/admin-ajax.php?action=stephino_rpg`
            );
        }
    };

    /**
     * Get the game window
     * 
     * @returns {Electron.BrowserWindow}
     */
    getGameWindow() {
        // Initialize the window
        if (null === Stephino_Rpg._gameWindow) {
            Stephino_Rpg._gameWindow = new BrowserWindow({
                width: core.config.stephino.windowWidth,
                height: core.config.stephino.windowHeight,
                icon: path.join(path.dirname(__dirname), 'ui/img/icon.ico'),
                resizable: true,
                titleBarStyle: 'hidden',
                title: 'Stephino RPG',
                useContentSize: true,
                backgroundColor: '#2e2c29',
                webPreferences: {
                    preload: path.join(__dirname, 'stephino-preload.js'),
                    nodeIntegration: true,
                    enableRemoteModule: true,
                    session: session.defaultSession
                }
            });

            // GC
            Stephino_Rpg._gameWindow.on('closed', () => {
                Stephino_Rpg._gameWindow = null;
            });

            // Dev mode
            core.config.stephino.debug && Stephino_Rpg._gameWindow.webContents.on('context-menu', (event, url) => {
                Stephino_Rpg._gameWindow.webContents.openDevTools({ mode: 'detach' });
            });

            // Open target="_blank" links in the user's browser
            Stephino_Rpg._gameWindow.webContents.on('new-window', (event, url) => {
                event.preventDefault();
                shell.openExternal(url);
            });

            // Hide the menu
            Stephino_Rpg._gameWindow.setMenu(null);

            // Prepre the store
            const storeCreds = new Store({name: 'stephino-rpg-creds'});

            // Validate e-mail and domain and prepare authentication token
            ipcMain.on('ipc:handshake', (event, args) => {
                const { userEmail, serverUrl } = args;

                // Not online
                if (!net.isOnline()) {
                    throw new Error('No Internet connection');
                }

                // Validate the e-mail
                if (!/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(String(userEmail).toLowerCase())) {
                    throw new Error('Invalid e-mail address');
                }

                // Prepare the URL
                var url = new URL(serverUrl);

                // Invalid protocol
                if (!/^https\:/.test(url.protocol)) {
                    throw new Error('Your website must use SSL');
                }

                // Test for dots (no localhost)
                if (!/\./.test(url.hostname)) {
                    throw new Error('Invalid hostname');
                }

                // Get the version for authenticated requests
                const requestVersion = net.request({
                    method: 'GET',
                    protocol: url.protocol,
                    hostname: url.hostname,
                    session: session.defaultSession,
                    useSessionCookies: true,
                    path: '/wp-json/stephino-rpg/v1/version'
                });
                requestVersion.on('response', (response) => {
                    if (200 !== response.statusCode) {
                        throw new Error("Server offline or Stephino RPG not installed");
                    }

                    // Read the readme to earch for the current version
                    response.on('data', (bytes) => {
                        let responseData = JSON.parse(String(bytes));
                        core.config.stephino.debug && console.log(responseData);
                        if (null === responseData || "object" !== typeof responseData || "string" !== typeof responseData.result) {
                            throw new Error('Could not detect Stephino RPG version');
                        }

                        // Send notification
                        event.reply('ipc:handshake', {
                            finalStep: false,
                            status: true,
                            message: `Stephino RPG v.${responseData.result} detected`,
                            data: responseData.result
                        });

                        // Wait between requests
                        setTimeout(() => {
                            const storeKey = crypto.createHash('md5').update(url.hostname + '/' + userEmail).digest("hex");

                            // Get auth token
                            const requestAuth = net.request({
                                method: 'POST',
                                protocol: url.protocol,
                                hostname: url.hostname,
                                session: session.defaultSession,
                                useSessionCookies: true,
                                path: '/wp-json/stephino-rpg/v1/auth'
                            });

                            // Pack the post data
                            requestAuth.setHeader('Content-Type', 'application/x-www-form-urlencoded');
                            requestAuth.write(querystring.stringify({
                                userEmail: userEmail,
                                userPassword: storeCreds.get(storeKey, "")
                            }));

                            requestAuth.on('response', (response) => {
                                response.on('data', (bytes) => {
                                    let responseData = JSON.parse(String(bytes));
                                    core.config.stephino.debug && console.log(responseData);

                                    // Generated a new password
                                    if (200 === response.statusCode && "string" === typeof responseData.result && responseData.result.length > 1) {
                                        // Store password for this e-mail
                                        storeCreds.set(storeKey, responseData.result);
                                    }

                                    // Prepare the status message
                                    let responseMessage = 'Loading game...';
                                    if (null !== responseData
                                        && "object" === typeof responseData
                                        && "string" === typeof responseData.message
                                        && responseData.message.length) {
                                        responseMessage = responseData.message;
                                    }

                                    // Send notification
                                    event.reply('ipc:handshake', {
                                        finalStep: true,
                                        status: 200 === response.statusCode,
                                        message: responseMessage,
                                        data: 200 === response.statusCode ? responseData.result : null
                                    });
                                });
                            });
                            requestAuth.end();
                        }, 1500);
                    });
                });
                requestVersion.end();
            });

            // Launch the game
            ipcMain.on('ipc:play', (event) => {
                this.navigate.play();
            });
        }

        return Stephino_Rpg._gameWindow;
    }

    /**
     * Get the browser view
     * 
     * @param boolean refresh
     * @returns {Electron.BrowserView}
     */
    getBrowserView(resetBounds) {
        var browserViewBounds = {
            width: core.config.stephino.windowWidth,
            height: core.config.stephino.windowHeight,
            x: 0,
            y: 0,
            horizontal: true,
            vertical: true
        };

        // Re-calculate browser view bounds
        var setNewBounds = function (stephinoRpg) {
            browserViewBounds.width = stephinoRpg.getGameWindow().getContentBounds().width;
            browserViewBounds.height = stephinoRpg.getGameWindow().getContentBounds().height;
            Stephino_Rpg._browserView.setBounds(browserViewBounds);
        };

        // Initiate the browser view
        if (null === Stephino_Rpg._browserView) {
            Stephino_Rpg._browserView = new BrowserView({
                webPreferences: {
                    session: session.defaultSession
                }
            });
            Stephino_Rpg._browserView.setBounds(browserViewBounds);
            Stephino_Rpg._browserView.setAutoResize({
                width: true,
                height: true
            });

            // Full-screen toggle
            this.getBrowserView().webContents.on('enter-html-full-screen', () => { setNewBounds(this); });
            this.getBrowserView().webContents.on('leave-html-full-screen', () => { setNewBounds(this); });

            // Failure to load
            this.getBrowserView().webContents.on('did-fail-load', () => { this.navigate.index(); });

            // Finished loading
            this.getBrowserView().webContents.on('did-finish-load', () => {
                this.getGameWindow().webContents.setAudioMuted(true);
            });

            // Open target="_blank" links in the user's browser
            Stephino_Rpg._browserView.webContents.on('new-window', (event, url) => {
                event.preventDefault();
                shell.openExternal(url);
            });

            // Dev mode
            core.config.stephino.debug && Stephino_Rpg._browserView.webContents.on('did-start-loading', (event, url) => {
                Stephino_Rpg._browserView.webContents.openDevTools({ mode: 'detach' });
            });
        }

        "boolean" === typeof resetBounds && resetBounds && setNewBounds(this);
        return Stephino_Rpg._browserView;
    }
})();

/*EOF*/