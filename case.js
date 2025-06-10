const { db } = require('./database');
const utils = require('./utils');
const config = require('./config');
const { 
    daftarCase, 
    menuCase, 
    profileCase, 
    addSaldoCase, 
    setLevelCase 
} = require('./func-case');

const handleCommand = async (sock, msg) => {
    try {
        const { command, args, sender, from } = msg;
        
        switch (command) {
            case 'daftar':
                await daftarCase(sock, msg);
                break;
                
            case 'menu':
                await menuCase(sock, msg);
                break;
                
            case 'profil':
                await profileCase(sock, msg);
                break;
                
            case 'addsaldo':
                await addSaldoCase(sock, msg);
                break;
                
            case 'setlevel':
                await setLevelCase(sock, msg);
                break;
                
            default:
                // Command tidak ditemukan, tidak perlu reply
                break;
        }
    } catch (error) {
        console.log('Error handling command:', error.message);
        await sock.sendMessage(msg.from, { text: config.messages.error });
    }
};

module.exports = { handleCommand };
