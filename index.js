const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers
} = require("baileys");
const pino = require('pino');
const chalk = require('chalk');
const qrcode = require('qrcode-terminal');
const readline = require('readline');
const { Boom } = require('@hapi/boom');

const { db } = require('./database');
const MessageHandler = require('./handler');
const config = require('./config');

const rl = readline.createInterface({ 
  input: process.stdin, 
  output: process.stdout 
});

// Banner
console.log(chalk.cyan(`
╔══════════════════════════════════════╗
║          WHATSAPP BOT SIMPLE         ║
║         Created with Baileys         ║
╚══════════════════════════════════════╝
`));

let sock;
let messageHandler;

async function startBot() {
    console.log(chalk.yellow('[•] Bot starting...'));
    
    try {
        await db.connect();
        
        const { state, saveCreds } = await useMultiFileAuthState(config.sessionName, pino({ level: 'fatal' }));
        
        if (!state.creds.registered) {
            console.log(chalk.yellow('[•] Session not found, please choose a login method:'));
            rl.question('1. QR Code\n2. Pairing Code\n[+] Pilih type login: ', async (option) => {
                if (option === '1') {
                    await createSocketWithQR(state, saveCreds);
                } else if (option === '2') {
                    await createSocketWithPairing(state, saveCreds);
                } else {
                    console.log(chalk.red('Invalid option'));
                    rl.close();
                    process.exit(1);
                }
            });
        } else {
            // Already registered, create socket directly
            await createSocket(state, saveCreds);
        }

    } catch (error) {
        console.log(chalk.red('❌ Error starting bot:', error.message));
        process.exit(1);
    }
}

async function createSocketWithQR(state, saveCreds) {
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        logger: pino({ level: 'fatal' }),
        browser: Browsers.appropriate("chrome"),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
        },
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message, jids) => jids ? jids.map(jid => ({ recipientJid: jid, ...message })) : message
    });

    await initializeSocket(saveCreds);
}

async function createSocketWithPairing(state, saveCreds) {
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        logger: pino({ level: 'fatal' }),
        browser: Browsers.appropriate("chrome"),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
        },
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message, jids) => jids ? jids.map(jid => ({ recipientJid: jid, ...message })) : message
    });

    rl.question(chalk.cyan('[+] Input nomor whatsapp: '), async (phoneNumber) => {
        try {
            const code = await sock.requestPairingCode(phoneNumber.replace(/\D/g, ''));
            console.log(chalk.green(`[+] Pairing Code: ${code.match(/.{1,4}/g)?.join('-')}\n`));
            await initializeSocket(saveCreds);
        } catch (error) {
            console.log(chalk.red('Failed to request pairing code:', error.message));
            rl.close();
            process.exit(1);
        }
    });
}

async function createSocket(state, saveCreds) {
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
        version,
        logger: pino({ level: 'fatal' }),
        browser: Browsers.appropriate("chrome"),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
        },
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message, jids) => jids ? jids.map(jid => ({ recipientJid: jid, ...message })) : message
    });

    await initializeSocket(saveCreds);
}

async function initializeSocket(saveCreds) {
    // Save credentials
    sock.ev.on('creds.update', saveCreds);

    // Initialize message handler
    messageHandler = new MessageHandler(sock);

    // Handle messages
    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (!message || message.key.fromMe) return;
        
        await messageHandler.handleMessage(message);
    });

    // Connection update
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(chalk.yellow('[•] Scan QR Code ini untuk login:'));
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log(chalk.green('[•] Bot connected!'));
            console.log(chalk.green(`📞 Nomor: ${sock.user.id.split(':')[0]}`));
            console.log(chalk.green(`📛 Nama: ${sock.user.name || 'Unknown'}`));
            console.log(chalk.green('🤖 Bot siap digunakan!'));
            
            rl.close();

            try {
                await sock.sendMessage(`${config.ownerNumber}@s.whatsapp.net`, {
                    text: `🤖 *${config.botName}*\n\n✅ Bot berhasil online!\n⏰ ${new Date().toLocaleString('id-ID', { timeZone: config.timezone })}`
                });
            } catch (error) {
                console.log(chalk.yellow('⚠️ Gagal mengirim pesan ke owner'));
            }
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error instanceof Boom ? 
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut : true;
            
            console.log(chalk.red('❌ Koneksi terputus:', lastDisconnect?.error));
            
            if (shouldReconnect) {
                console.log(chalk.yellow('🔄 Mencoba reconnect...'));
                await startBot();
            } else {
                console.log(chalk.red('🚪 Bot logout, silakan restart'));
                rl.close();
                process.exit(0);
            }
        }
    });

    // Handle group updates
    sock.ev.on('groups.update', async (updates) => {
        for (const update of updates) {
            try {
                await db.updateGroup(update.id, {
                    name: update.subject || undefined,
                    desc: update.desc || undefined
                });
            } catch (error) {
            }
        }
    });

    // Handle participants update
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const groupData = await db.getGroup(update.id);
            if (!groupData) return;

            // Implementasi welcome/goodbye bisa ditambahkan di sini
            
        } catch (error) {
            console.log(chalk.red('Error handling participant update:', error.message));
        }
    });
}

process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n⚠️ Shutting down bot...'));
    if (sock) {
        sock.end();
    }
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n⚠️ SIGTERM received, shutting down bot...'));
    if (sock) {
        sock.end();
    }
    rl.close();
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.log(chalk.red('❌ Uncaught Exception:', error.message));
});

process.on('unhandledRejection', (error) => {
    console.log(chalk.red('❌ Unhandled Rejection:', error.message));
});

startBot();
