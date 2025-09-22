const chalk = require('chalk')
const { makeWASocket, useMultiFileAuthState, DisconnectReason, proto, prepareWAMessageMedia, generateWAMessageFromContent } = require("@whiskeysockets/baileys")
const fs = require('fs')
const path = require('path')
const levenshtein = require('fast-levenshtein');
require('./settings')

module.exports = lang = async (lang, m, chatUpdate, messages) => {
    const isOwner = global.ownerNumber.includes(m.sender.split`@`[0])
    const isRegistered = true
    const prefix = global.prefix;
    var body = m?.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
        ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id
        : m?.message?.conversation ||
        m?.message?.imageMessage?.caption ||
        m?.message?.videoMessage?.caption ||
        m?.message?.extendedTextMessage?.text ||
        m?.message?.buttonsResponseMessage?.selectedButtonId ||
        m?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        m?.message?.templateButtonReplyMessage?.selectedId ||
        m?.message?.buttonsResponseMessage?.selectedButtonId ||
        m?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        m?.text || "";
    const args = body.trim().split(/ +/).slice(1);
    var budy = (typeof m.text == 'string' ? m.text : '');
    const text = args.join(" ");
    const isCmd = body.startsWith(prefix);
    const moment = require('moment-timezone')
    const time = moment(Date.now()).tz('Asia/Jakarta').locale('id').format('HH:mm:ss z')
    const groupMetadata = m.isGroup ? await lang.groupMetadata(m.chat).catch(e => { }) : ''
    const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : "";
    const groupName = m.isGroup ? groupMetadata?.subject : ''
    
    if (m.message) {
        console.log('\x1b[1;31m~\x1b[1;37m>', '[\x1b[1;32m langgg >< \x1b[1;37m]', time, chalk.green(budy.slice(0, 100) || m.mtype), 'from', chalk.green(m.pushName || ''), 'in', chalk.green(groupName ? groupName : 'Private Chat'), 'args :', chalk.green(text.length))
    }
    
    if (isCmd && !isRegistered && command !== 'register') return m.reply(`╭───〔 BELUM TERDAFTAR 〕───
┊ _Silahkan daftar terlebih_
┊ _dahulu untuk menggunakan bot_
┊
┊ _Ketik ${prefix}register untuk_
┊ _mendaftar_
╰───────────────────
`)

    const menu_data = require('./database/menu.json');
    const falias = (cmd) => {
        for (const category in menu_data) {
            for (const key in menu_data[category]) {
                if (key === cmd || menu_data[category][key].alias.includes(cmd)) {
                    return key;
                }
            }
        }
        return cmd;
    };

    const fc = (cmd) => {
        let bm = null;
        let hs = 0;

        for (const category in menu_data) {
            for (const key in menu_data[category]) {
                const distance = levenshtein.get(cmd, key);
                const ml = Math.max(cmd.length, key.length);
                const sml = ((ml - distance) / ml) * 100;

                if (sml > hs) {
                    hs = sml;
                    bm = key;
                }
            }
        }

        return { bm, hs };
    };

    try {
        if (command) {
            const oc = falias(command);
            require(`./plugins/${oc}`)(lang, m, isRegistered, text, isOwner, command, prefix);
        }
    } catch (e) {
        if (e.code && e.code.includes('MODULE_NOT_FOUND')) {
            if (isRegistered && process.env.CORRECT_COMMAND === 'true') {
                const { bm, hs } = fc(command);
                if (bm && hs > 50) {
                    m.reply(`Perintah tidak ditemukan. Apakah kamu bermaksud *${bm}*? (${hs.toFixed(2)}% kecocokan)`);
                } else {
                    // Command not found and no good suggestion
                }
            }
        } else {
            console.log('Error:', e);
        }
    }

    switch (command) {
        // Add your commands here
    }
};

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});

const pluginsDir = path.join(__dirname, 'plugins');

if (fs.existsSync(pluginsDir)) {
    fs.readdirSync(pluginsDir).forEach(file => {
        const pluginPath = path.join(pluginsDir, file);

        if (fs.lstatSync(pluginPath).isFile() && file.endsWith('.js')) {
            fs.watchFile(pluginPath, () => {
                fs.unwatchFile(pluginPath);
                console.log(chalk.greenBright(`Update detected in ${pluginPath}`));
                delete require.cache[require.resolve(pluginPath)];
                require(pluginPath);
            });
        }
    });
}

let chi = require.resolve('./database/menu.json');
fs.watchFile(chi, () => {
    fs.unwatchFile(chi);
    console.log(chalk.redBright(`Update ./database/menu.json`));
    delete require.cache[chi];
    require(chi);
});