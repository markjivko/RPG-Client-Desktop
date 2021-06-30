/**
 * Stephino_Rpg
 *
 * @title      RPG
 * @desc       Window preload
 * @copyright  (c) 2021, Stephino
 * @author     Mark Jivko <stephino.team@gmail.com>
 * @package    stephino-rpg
 * @license    GPL v3+, https://gnu.org/licenses/gpl-3.0.txt
 */
const { remote, ipcRenderer } = require('electron');
const core = require('../../package.json');
const crypto = require('crypto');
const Store = require('electron-store');

window.addEventListener('DOMContentLoaded', () => {
    window.$ = window.jQuery = require('jquery');
    const storeMain = new Store({name: 'stephino-rpg'});
    const storeCreds = new Store({name: 'stephino-rpg-creds'});

    var stephino_rpg_tools = {
        toast: {
            _objects: {
                infoBadge: null
            },
            _timer: null,
            show: (message, status, duration) => {
                // Initialize the info badge
                if (null === stephino_rpg_tools.toast._objects.infoBadge) {
                    stephino_rpg_tools.toast._objects.infoBadge = $('[data-role="info-badge"]');
                }
                
                // Invalid HTML
                if (!stephino_rpg_tools.toast._objects.infoBadge.length) {
                    return;
                }
                
                // Sanitize status
                if ("undefined" === typeof status) {
                    status = true;
                } else {
                    status = !!status;
                }
    
                // Default message
                if ("undefined" === typeof message) {
                    message = null;
                } else {
                    message += "";
                }
                
                // Sanitize the duration
                if ("undefined" === typeof duration) {
                    duration = 3000;
                }
    
                // Store the status
                if (!status) {
                    if (!stephino_rpg_tools.toast._objects.infoBadge.hasClass('badge-error')) {
                        stephino_rpg_tools.toast._objects.infoBadge.addClass('badge-error');
                    }
                } else {
                    if (stephino_rpg_tools.toast._objects.infoBadge.hasClass('badge-error')) {
                        stephino_rpg_tools.toast._objects.infoBadge.removeClass('badge-error');
                    }
                }
    
                // Store the message
                stephino_rpg_tools.toast._objects.infoBadge.find('.message').html(message);
    
                // Show the info badge
                stephino_rpg_tools.toast._objects.infoBadge.stop(true).fadeIn(500);
                if (!stephino_rpg_tools.toast._objects.infoBadge.hasClass('active')) {
                    stephino_rpg_tools.toast._objects.infoBadge.addClass('active');
                }
    
                // Another timer is running, remove it, keeping the message visible as long as needed
                if (null !== stephino_rpg_tools.toast._timer) {
                    window.clearTimeout(stephino_rpg_tools.toast._timer);
                }
    
                // Add a new timer
                stephino_rpg_tools.toast._timer = window.setTimeout(() => {
                    if (stephino_rpg_tools.toast._objects.infoBadge.hasClass('active')) {
                        stephino_rpg_tools.toast._objects.infoBadge.removeClass('active');
                    }
                
                    // Hide the badge
                    stephino_rpg_tools.toast._objects.infoBadge.fadeOut(500);
    
                    // Remove our own timer
                    if (null !== stephino_rpg_tools.toast._timer) {
                        window.clearTimeout(stephino_rpg_tools.toast._timer);
                    }
                }, duration);
            }
        },
        loading: (loadingState, message) => {
            if (loadingState && "string" !== typeof message)  {
                message = 'Loading...';
            }

            if (loadingState) {
                !$('body').hasClass('loading') && $('body').addClass('loading');
                $('form button').attr('disabled', 'disabled');
                $('[data-role="loading"] > span').text(message);
            } else {
                $('body').hasClass('loading') && $('body').removeClass('loading');
                $('form button').removeAttr('disabled');
                $('[data-role="loading"] > span').text('');
            }
        }
    };

    // Labels
    $('[data-role="stephino-version"] b').html(remote.app.getVersion());
    $('[data-link="plugin"]').attr('href', core.config.stephino.pluginUrl).one('mouseover', function() {
        stephino_rpg_tools.toast.show('Click to learn more');
    });

    // Prepare the server URL
    var url = new URL(storeMain.get("serverUrl", core.config.stephino.serverUrl));
    
    // Get the store key
    const storeKey = crypto.createHash('md5').update(
        url.hostname + '/' + storeMain.get("userEmail", "")
    ).digest("hex");

    // Prepare the credentials
    $('[name="user-email"]').val(storeMain.get("userEmail", ""));
    $('[name="user-password"]').val(storeCreds.get(storeKey, ""));
    $('[name="server-url"]').val(storeMain.get("serverUrl", core.config.stephino.serverUrl));    

    // Volumes
    $('[data-audio="music"]')[0].volume = 0.3;
    $('[data-audio="ambiance"]')[0].volume = 0.2;

    // Help options
    $('[data-help]').off('click').on('click', function(event) {
        event.preventDefault();
        var helpObject = $('[data-role="stephino-login-help"]');

        // Toggle the help section
        helpObject.children().removeClass('active');
        helpObject.children(`[data-help-item="${$(this).attr('data-help')}"]`).addClass('active');
    });

    // Initiate handshake
    $('form').off('submit').on('submit', function(event) {
        event.preventDefault();
        stephino_rpg_tools.loading(true, "Preparing account...");
        stephino_rpg_tools.toast.show('Checking server version...');

        // Update the cache
        storeCreds.set(storeKey, $(this).find('[name="user-password"]').val());
        storeMain.set('userEmail', $(this).find('[name="user-email"]').val());
        storeMain.set('serverUrl', $(this).find('[name="server-url"]').val());

        // Start the auth procedure
        window.setTimeout(() => {
            ipcRenderer.send('ipc:handshake', {
                userEmail: storeMain.get("userEmail", ""),
                serverUrl: storeMain.get("serverUrl", core.config.stephino.serverUrl)
            });
        }, 1500);
        
        return false;
    });

    // Transition
    window.setTimeout(() => {
        $('body').addClass('ready');
    }, 1500);

    // Event listeners
    ipcRenderer.on('ipc:handshake', (event, args) => {
        const { finalStep, data, message, status } = args;

        if ("string" === typeof message) {
            stephino_rpg_tools.toast.show(message, status);
        }

        // Handshake successful
        if ("boolean" === typeof finalStep && finalStep) {
            stephino_rpg_tools.loading(false);
            
            // Hide the form
            !$('body').hasClass('playing') && $('body').addClass('playing');
            $('form button').attr('disabled', 'disabled');

            // Launch the game
            window.setTimeout(() => {
                ipcRenderer.send('ipc:play');
            }, 2000);
        }
    });

    // Uncaught exceptions
    ipcRenderer.on('ipc:error', (event, message) => {
        stephino_rpg_tools.loading(false);
        
        if ("string" === typeof message) {
            stephino_rpg_tools.toast.show(message, false);
        }
    });
});

/*EOF*/