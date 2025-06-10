const { db } = require('./database');
const utils = require('./utils');
const config = require('./config');

// Case Daftar
const daftarCase = async (sock, msg) => {
    try {
        const existingUser = await db.getUser(msg.sender);
        if (existingUser && existingUser.isRegistered) {
            return sock.sendMessage(msg.from, { 
                text: '✅ Kamu sudah terdaftar!' 
            });
        }

        const contact = await sock.onWhatsApp(msg.sender);
        const name = contact[0]?.notify || utils.getNumber(msg.sender);

        const level = utils.isOwner(msg.sender) ? 'owner' : 'guest';

        await db.addUser(msg.sender, name);
        await db.setLevel(msg.sender, level);

        const responseText = `✅ *Pendaftaran Berhasil!*

*Nama:* ${name}
*Nomor:* ${utils.getNumber(msg.sender)}
*Level:* ${utils.capitalize(level)}
*Saldo:* ${utils.formatSaldo(0)}
*Terdaftar:* ${utils.formatTime()}

Selamat bergabung di ${config.botName}!`;

        await sock.sendMessage(msg.from, { text: responseText });

    } catch (error) {
        console.log('Error daftar case:', error.message);
        await sock.sendMessage(msg.from, { 
            text: '❌ Gagal mendaftar, coba lagi nanti' 
        });
    }
};

// Case Menu
const menuCase = async (sock, msg) => {
    try {
        const user = await db.getUser(msg.sender);
        
        let menuText = `🤖 *${config.botName}*
${utils.formatTime()}

*USER INFO*
Nama: ${user.name}
Level: ${utils.capitalize(user.level)}
Saldo: ${utils.formatSaldo(user.saldo)}

📋 *MENU UMUM*
${config.prefix}menu - Tampilkan menu
${config.prefix}profile - Lihat profile
${config.prefix}daftar - Daftar ke bot`;

        // Menu untuk Owner
        if (utils.isOwner(msg.sender)) {
            menuText += `\n\n👑 *MENU OWNER*
${config.prefix}setlevel <nomor> <level> - Set level user
${config.prefix}setsaldo <nomor> <jumlah> - Set saldo user`;
        }

        menuText += `\n\n📞 *CONTACT*
Owner: wa.me/${config.ownerNumber}`;

        await sock.sendMessage(msg.from, { text: menuText });

    } catch (error) {
        console.log('Error menu case:', error.message);
        await sock.sendMessage(msg.from, { text: config.messages.error });
    }
};

// Case Profile
const profileCase = async (sock, msg) => {
    try {
        const user = await db.getUser(msg.sender);

        const responseText = `👤 *PROFILE USER*

*Nama:* ${user.name}
*Nomor:* ${utils.getNumber(user.jid)}
*Level:* ${utils.capitalize(user.level)}
*Saldo:* ${utils.formatSaldo(user.saldo)}
*Terdaftar:* ${utils.formatTime(user.registeredAt)}
*Last Seen:* ${utils.formatTime(user.lastSeen)}`;

        await sock.sendMessage(msg.from, { text: responseText });

    } catch (error) {
        console.log('Error profile case:', error.message);
        await sock.sendMessage(msg.from, { text: config.messages.error });
    }
};

// Case Add Saldo
const addSaldoCase = async (sock, msg) => {
    try {
        const user = await db.getUser(msg.sender);
        
        if (!utils.isOwner(msg.sender)) {
            return sock.sendMessage(msg.from, { 
                text: config.messages.owner 
            });
        }

        if (msg.args.length < 2) {
            return sock.sendMessage(msg.from, { 
                text: `❌ Format salah!\n\nContoh: ${config.prefix}addsaldo 628xxx 10000` 
            });
        }

        const targetNumber = msg.args[0];
        const amount = parseInt(msg.args[1]);

        if (isNaN(amount) || amount <= 0) {
            return sock.sendMessage(msg.from, { 
                text: '❌ Jumlah saldo harus berupa angka positif!' 
            });
        }

        const targetJid = utils.formatPhone(targetNumber);
        
        const targetUser = await db.getUser(targetJid);
        if (!targetUser) {
            return sock.sendMessage(msg.from, { 
                text: '❌ User target belum terdaftar!' 
            });
        }

        const updatedUser = await db.addSaldo(targetJid, amount);

        const responseText = `✅ *SALDO BERHASIL DITAMBAH*

*Target:* ${targetUser.name}
*Nomor:* ${utils.getNumber(targetJid)}
*Saldo Lama:* ${utils.formatSaldo(updatedUser.saldo - amount)}
*Saldo Baru:* ${utils.formatSaldo(updatedUser.saldo)}
*Ditambah:* ${utils.formatSaldo(amount)}`;

        await sock.sendMessage(msg.from, { text: responseText });

    } catch (error) {
        console.log('Error addsaldo case:', error.message);
        await sock.sendMessage(msg.from, { text: config.messages.error });
    }
};


// Case Set Level
const setLevelCase = async (sock, msg) => {
    try {
        if (!utils.isOwner(msg.sender)) {
            return sock.sendMessage(msg.from, { 
                text: config.messages.owner 
            });
        }

        if (msg.args.length < 2) {
            return sock.sendMessage(msg.from, { 
                text: `❌ Format salah!\n\nContoh: ${config.prefix}setlevel 628xxx reseller\n\nLevel: guest, reseller, owner` 
            });
        }

        const targetNumber = msg.args[0];
        const newLevel = msg.args[1].toLowerCase();

        const validLevels = ['guest', 'reseller', 'owner'];
        if (!validLevels.includes(newLevel)) {
            return sock.sendMessage(msg.from, { 
                text: '❌ Level tidak valid! Pilih: guest, reseller, owner' 
            });
        }

        const targetJid = utils.formatPhone(targetNumber);
        
        const targetUser = await db.getUser(targetJid);
        if (!targetUser) {
            return sock.sendMessage(msg.from, { 
                text: '❌ User target belum terdaftar!' 
            });
        }

        await db.setLevel(targetJid, newLevel);

        const responseText = `✅ *LEVEL BERHASIL DIUBAH*

*Target:* ${targetUser.name}
*Nomor:* ${utils.getNumber(targetJid)}
*Level Lama:* ${utils.capitalize(targetUser.level)}
*Level Baru:* ${utils.capitalize(newLevel)}`;

        await sock.sendMessage(msg.from, { text: responseText });

    } catch (error) {
        console.log('Error setlevel case:', error.message);
        await sock.sendMessage(msg.from, { text: config.messages.error });
    }
};

module.exports = { 
    daftarCase, 
    menuCase, 
    profileCase, 
    addSaldoCase, 
    setLevelCase 
};
