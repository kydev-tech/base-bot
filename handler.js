const config = require('./config');
const utils = require('./utils');
const { db } = require('./database');
const { handleCommand } = require('./case');
const chalk = require('chalk');

class MessageHandler {
    constructor(sock) {
        this.sock = sock;
        console.log(chalk.green('📄 Case handler loaded'));
    }

    // Handle pesan masuk
    async handleMessage(m) {
        try {
            if (m.key.fromMe) return;

            const messageType = Object.keys(m.message || {})[0];
            const text = m.message?.conversation || 
                        m.message?.extendedTextMessage?.text || 
                        m.message?.[messageType]?.caption || '';

            if (!text.startsWith(config.prefix)) return;

            const args = text.slice(config.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            const msg = {
                key: m.key,
                from: m.key.remoteJid,
                sender: m.key.participant || m.key.remoteJid,
                isGroup: m.key.remoteJid.endsWith('@g.us'),
                text: text,
                args: args,
                command: command,
                messageType: messageType,
                quoted: m.message?.extendedTextMessage?.contextInfo?.quotedMessage
            };
          
            await this.updateUserActivity(msg.sender);

            await this.executeCommand(msg);

        } catch (error) {
            console.log(chalk.red('❌ Error handling message:', error.message));
        }
    }

    // Update aktivitas user
    async updateUserActivity(jid) {
        try {
            await db.updateUser(jid, { lastSeen: new Date() });
        } catch (error) {
            // Ignore error jika user belum ada
        }
    }

    // Execute command
    async executeCommand(msg) {
        try {
            // Cek apakah user sudah terdaftar (kecuali untuk command daftar)
            if (msg.command !== 'daftar') {
                const user = await db.getUser(msg.sender);
                if (!user || !user.isRegistered) {
                    return await this.reply(msg, config.messages.notRegistered);
                }
            }

            await handleCommand(this.sock, msg);

        } catch (error) {
            console.log(chalk.red(`❌ Error executing command ${msg.command}:`, error.message));
            await this.reply(msg, config.messages.error);
        }
    }

    // Reply pesan
    async reply(msg, text) {
        try {
            return await this.sock.sendMessage(msg.from, { text });
        } catch (error) {
            console.log(chalk.red('❌ Error sending reply:', error.message));
        }
    }
}

module.exports = MessageHandler;
