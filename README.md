<p align="center">
    <a href="https://wordpress.org/plugins/stephino-rpg">
        <img src=""/>
    </a>
</p>

# Stephino RPG (Desktop Client)

Connect to your favorite [Stephino RPG](https://github.com/Stephino/RPG) server right from your desktop.

This app manages your login credentials and checks the remote server version for compatibility.

The game runs as a [Progressive Web Application](https://web.dev/progressive-web-apps) inside of a local, secure [Electron.js](https://www.electronjs.org/) web browser.

Once installed, all game assets are stored safely on your device and all the requests triggered by the game are remote procedure calls.

### Getting started

Assuming you have installed `node` and `git` on your system, you should run the following commands:

```
git clone https://github.com/stephino/rpg-client-desktop .
npm install --save-dev electron @electron-forge/cli electron-store i18n jquery
npm start
```

### Hosting your own games

You can host this game on your own domain by installing [Stephino RPG](https://wordpress.org/plugins/stephino-rpg) on your WordPress website.

In order to unlock the `Game Mechanics` and get access to all game assets, you will also need to install [Stephino RPG Pro](https://gum.co/stephino-rpg).
