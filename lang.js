const { makeWASocket, jidDecode, useMultiFileAuthState, downloadContentFromMessage, DisconnectReason, generateWAMessageFromContent, generateWAMessageContent, proto, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers } = require("@whiskeysockets/baileys")
const readline = require('readline')
const question = (text) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); return new Promise((resolve) => { rl.question(text, resolve) }) };
const pino = require('pino')
const packageJson = require('./package.json');
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const FileType = require('file-type')
const path = require('path')
const { messageParser } = require('./lib/parser')
const chalk = require('chalk')
const dotenv = require('dotenv')
require('dotenv').config()
require('./settings')
const PhoneNumber = require('awesome-phonenumber')

// Banner
console.log(chalk.cyan(`
╔══════════════════════════════════════╗
║          WHATSAPP BOT SIMPLE         ║
║         Created with Baileys         ║
╚══════════════════════════════════════╝
`));

async function startBot() {
    console.log(chalk.yellow('[•] Bot starting...'));
    
    try {
        await fs.promises.mkdir('temp', { recursive: true })
        
        const { state, saveCreds } = await useMultiFileAuthState("sessionlang")
        const { version } = await fetchLatestBaileysVersion();
        
        const lang = makeWASocket({
            version,
            logger: pino({ level: "fatal" }),
            printQRInTerminal: false,
            browser: Browsers.appropriate("chrome"),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
            },
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: true,
            markOnlineOnConnect: true,
            patchMessageBeforeSending: (message, jids) => jids ? jids.map(jid => ({ recipientJid: jid, ...message })) : message
        });

        // Store lang instance globally
        global.lang = lang;

        if (!lang.authState.creds.registered) {
            console.log(chalk.cyan('[+] Input nomor whatsapp: '));
            const nomer = await question("")
            console.log(chalk.yellow('[•] Requesting pairing code...'));
            try {
                const kode = await lang.requestPairingCode(nomer.replace(/\D/g, ''))
                console.log(chalk.green(`[+] Pairing Code: ${kode.match(/.{1,4}/g)?.join('-')}`))
            } catch (error) {
                console.log(chalk.red('Failed to request pairing code:', error.message));
                process.exit(1);
            }
        }

        lang.ev.on('creds.update', await saveCreds)
        
        lang.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update
            
            if (connection === 'close') {
                let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

                switch (reason) {
                    case DisconnectReason.badSession:
                        console.log(chalk.red("❌ Bad Session File, Please Delete Session and Scan Again"));
                        lang.logout();
                        break;
                    case DisconnectReason.connectionClosed:
                        console.log(chalk.yellow("🔄 Connection closed, reconnecting...."));
                        startBot();
                        break;
                    case DisconnectReason.connectionLost:
                        console.log(chalk.yellow("🔄 Connection Lost from Server, reconnecting..."));
                        startBot();
                        break;
                    case DisconnectReason.connectionReplaced:
                        console.log(chalk.red("❌ Connection Replaced, Another New Session Opened, Please Close Current Session First"));
                        lang.logout();
                        break;
                    case DisconnectReason.loggedOut:
                        console.log(chalk.red("🚪 Device Logged Out, Please Scan Again And Run."));
                        lang.logout();
                        break;
                    case DisconnectReason.restartRequired:
                        console.log(chalk.yellow("🔄 Restart Required, Restarting..."));
                        startBot();
                        break;
                    default:
                        console.log(chalk.yellow("🔄 Unknown disconnection reason, attempting to reconnect..."));
                        startBot();
                }
            }

            if (connection === 'open') {
                console.log(chalk.green('[•] Bot connected!'));
                console.log(chalk.green(`📞 Nomor: ${lang.user.id.split(':')[0]}`));
                console.log(chalk.green(`📛 Nama: ${lang.user.name || 'Unknown'}`));
                console.log(chalk.green('🤖 Bot siap digunakan!'));
                
                // Send notification to owner
                try {
                    lang.sendMessage(`${global.ownerNumber[0]}@s.whatsapp.net`, {
                        text: `🤖 *Bot Online*\n\n✅ Bot berhasil online!\n⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
                    });
                } catch (error) {
                    console.log(chalk.yellow('⚠️ Gagal mengirim pesan ke owner'));
                }
            }
        })

        lang.getFile = async (PATH, returnAsFilename) => {
            let res, filename
            let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
            if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
            let type = await FileType.fromBuffer(data) || {
                mime: 'application/octet-stream',
                ext: '.bin'
            }
            if (data && returnAsFilename && !filename) (filename = path.join(__dirname, './temp/' + new Date * 1 + '.' + type.ext), await fs.promises.writeFile(filename, data))
            return {
                res,
                filename,
                ...type,
                data
            }
        }

        lang.downloadMediaMessage = async (message) => {
            let mime = (message.msg || message).mimetype || ''
            let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
            const stream = await downloadContentFromMessage(message, messageType)
            let buffer = Buffer.from([])
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk])
            }
            return buffer
        }

        lang.sendButtonMsg = async (jid, content = {}, options = {}) => {
            const { text, caption, footer = '', headerType = 1, ai, contextInfo = {}, buttons = [], mentions = [], ...media } = content;
            const msg = await generateWAMessageFromContent(jid, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: {
                            deviceListMetadata: {},
                            deviceListMetadataVersion: 2,
                        },
                        buttonsMessage: {
                            ...(media && typeof media === 'object' && Object.keys(media).length > 0 ? await generateWAMessageContent(media, {
                                upload: lang.waUploadToServer
                            }) : {}),
                            contentText: text || caption || '',
                            footerText: footer,
                            buttons,
                            headerType: media && Object.keys(media).length > 0 ? Math.max(...Object.keys(media).map((a) => ({ document: 3, image: 4, video: 5, location: 6 })[a] || headerType)) : headerType,
                            contextInfo: {
                                ...contextInfo,
                                ...options.contextInfo,
                                mentionedJid: options.mentions || mentions,
                                ...(options.quoted ? {
                                    stanzaId: options.quoted.key.id,
                                    remoteJid: options.quoted.key.remoteJid,
                                    participant: options.quoted.key.participant || options.quoted.key.remoteJid,
                                    fromMe: options.quoted.key.fromMe,
                                    quotedMessage: options.quoted.message
                                } : {})
                            }
                        }
                    }
                }
            }, {});
            const hasil = await lang.relayMessage(msg.key.remoteJid, msg.message, {
                messageId: msg.key.id,
                additionalNodes: [{
                    tag: 'biz',
                    attrs: {},
                    content: [{
                        tag: 'interactive',
                        attrs: {
                            type: 'native_flow',
                            v: '1'
                        },
                        content: [{
                            tag: 'native_flow',
                            attrs: {
                                name: 'quick_reply'
                            }
                        }]
                    }]
                }, ...(ai ? [{ attrs: { biz_bot: '1' }, tag: 'bot' }] : [])]
            })
            return msg
        }

        lang.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
            let type = await lang.getFile(path, true)
            let {
                res,
                data: file,
                filename: pathFile
            } = type
            if (res && res.status !== 200 || file.length <= 65536) {
                try {
                    throw {
                        json: JSON.parse(file.toString())
                    }
                }
                catch (e) {
                    if (e.json) throw e.json
                }
            }
            let opt = {
                filename
            }
            if (quoted) opt.quoted = quoted
            if (!type) options.asDocument = true
            let mtype = '',
                mimetype = type.mime,
                convert
            if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'
            else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'
            else if (/video/.test(type.mime)) mtype = 'video'
            else if (/audio/.test(type.mime)) (
                convert = await toAudio(file, type.ext),
                file = convert.data,
                pathFile = convert.filename,
                mtype = 'audio',
                mimetype = 'audio/ogg; codecs=opus'
            )
            else mtype = 'document'
            if (options.asDocument) mtype = 'document'

            delete options.asSticker
            delete options.asLocation
            delete options.asVideo
            delete options.asDocument
            delete options.asImage

            let message = {
                ...options,
                caption,
                ptt,
                [mtype]: {
                    url: pathFile
                },
                mimetype,
                fileName: filename || pathFile.split('/').pop()
            }
            let m
            try {
                m = await lang.sendMessage(jid, message, {
                    ...opt,
                    ...options
                })
            }
            catch (e) {
                //console.error(e)
                m = null
            }
            finally {
                if (!m) m = await lang.sendMessage(jid, {
                    ...message,
                    [mtype]: file
                }, {
                    ...opt,
                    ...options
                })
                file = null
                return m
            }
        }

        lang.getName = (jid, withoutContact = false) => {
            id = lang.decodeJid(jid)
            withoutContact = lang.withoutContact || withoutContact
            let v
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = {}
                if (!(v.name || v.subject)) v = lang.groupMetadata(id) || {}
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
            })
            else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === lang.decodeJid(lang.user.id) ?
                lang.user :
                {}
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
        }

        lang.sendContact = async (jid, kon, quoted = '', opts = {}) => {
            let list = []
            for (let i of kon) {
                list.push({
                    displayName: await lang.getName(i + '@s.whatsapp.net'),
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await lang.getName(i + '@s.whatsapp.net')}\nFN:${await lang.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.EMAIL;type=INTERNET:kawaii@chiwa.id\nitem2.X-ABLabel:Email\nitem3.URL:https://chiwa.id\nitem3.X-ABLabel:Instagram\nitem4.ADR:;;Indonesia;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`
                })
            }
            lang.sendMessage(jid, { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts }, { quoted })
        }

        lang.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        lang.sendText = (jid, text, quoted = '', options) => lang.sendMessage(jid, { text: text, ...options }, { quoted, ...options })

        lang.sendMedia = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
            let types = await lang.getFile(path, true)
            let { mime, ext, res, data, filename } = types
            if (res && res.status !== 200 || file.length <= 65536) {
                try { throw { json: JSON.parse(file.toString()) } }
                catch (e) { if (e.json) throw e.json }
            }
            let type = '', mimetype = mime, pathFile = filename
            if (options.asDocument) type = 'document'
            if (options.asSticker || /webp/.test(mime)) {
                let media = { mimetype: mime, data }
                pathFile = await writeExif(media, { packname: options.packname ? options.packname : global.packname, author: options.author ? options.author : global.author, categories: options.categories ? options.categories : [] })
                await fs.promises.unlink(filename)
                type = 'sticker'
                mimetype = 'image/webp'
            }
            else if (/image/.test(mime)) type = 'image'
            else if (/video/.test(mime)) type = 'video'
            else if (/audio/.test(mime)) type = 'audio'
            else type = 'document'
            await lang.sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ...options })
            return fs.promises.unlink(pathFile)
        }

        lang.ev.on('messages.upsert', async chatUpdate => {
            try {
                for (let messages of chatUpdate.messages) {
                    if (!messages.message) return
                    messages.message = (Object.keys(messages.message)[0] === 'ephemeralMessage') ? messages.message.ephemeralMessage.message : messages.message
                    if (messages.key && messages.key.remoteJid === 'status@broadcast') return
                    if (messages.key.id.startsWith('BAE5') && messages.key.id.length === 16) return
                    const m = messageParser(lang, messages)
                    require("./langs")(lang, m, chatUpdate, messages)
                }
            } catch (err) {
                console.log(chalk.red('Error processing message:', err.message))
            }
        })

        lang.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = lang.decodeJid(contact.id)
                // Store contact info in memory if needed
            }
        })

        // Handle group updates
        lang.ev.on('groups.update', async (updates) => {
            for (const update of updates) {
                try {
                    // Handle group updates if needed
                } catch (error) {
                    console.log(chalk.red('Error handling group update:', error.message));
                }
            }
        });

        // Handle participants update  
        lang.ev.on('group-participants.update', async (update) => {
            try {
                // Handle participant updates if needed
            } catch (error) {
                console.log(chalk.red('Error handling participant update:', error.message));
            }
        });

    } catch (error) {
        console.log(chalk.red('❌ Error starting bot:', error.message));
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n⚠️ Shutting down bot gracefully...'));
    if (global.lang) {
        try {
            // Try to close WebSocket connection properly
            if (global.lang.ws && global.lang.ws.readyState === 1) {
                global.lang.ws.close();
            }
            // Clear the global reference
            global.lang = null;
        } catch (error) {
            // Silently handle any shutdown errors
        }
    }
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n⚠️ SIGTERM received, shutting down bot...'));
    if (global.lang) {
        try {
            // Try to close WebSocket connection properly
            if (global.lang.ws && global.lang.ws.readyState === 1) {
                global.lang.ws.close();
            }
            // Clear the global reference
            global.lang = null;
        } catch (error) {
            // Silently handle any shutdown errors
        }
    }
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

process.on('uncaughtException', (error) => {
    console.log(chalk.red('❌ Uncaught Exception:', error.message));
    // Don't exit immediately, let the process handle it gracefully
});

process.on('unhandledRejection', (error) => {
    console.log(chalk.red('❌ Unhandled Rejection:', error.message));
    // Don't exit immediately for unhandled rejections
});

startBot().catch(error => {
    console.log(chalk.red('❌ Fatal Error:', error.message));
    process.exit(1);
});