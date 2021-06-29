/**
 * Stephino_Rpg
 *
 * @title      RPG
 * @desc       Entry point
 * @copyright  (c) 2021, Stephino
 * @author     Mark Jivko <stephino.team@gmail.com>
 * @package    stephino-rpg
 * @license    GPL v3+, https://gnu.org/licenses/gpl-3.0.txt
 */
const { app, BrowserWindow } = require('electron');
const stephinoRpg = require('./src/lib/stephino-rpg');
const config = require('./package.json');
const path = require('path');
const i18n = require('i18n');

// Singleton instance of i18n
i18n.configure({
    locales: ['en', 'de', 'fr', 'it', 'es', 'pt', 'ru', 'ro'],
    directory: path.join(__dirname, 'src/languages'),
    register: stephinoRpg
});

// Uncaught exceptions
process.on('uncaughtException', (exc) => {
    stephinoRpg.getGameWindow().webContents.send('ipc:error', exc.message);
    config.stephinoRpg.debug && console.warn(exc);
});

// App ready
app.whenReady().then(() => {
    stephinoRpg.navigate.index();

    // Re-launch on macOS
    app.on('activate', () => {
        0 === BrowserWindow.getAllWindows().length && stephinoRpg.navigate.index();
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    'darwin' !== process.platform && app.quit();
});

/*EOF*/