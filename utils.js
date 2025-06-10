const moment = require('moment-timezone');
const config = require('./config');

const utils = {
    // Format waktu
    formatTime(date = new Date()) {
        return moment(date).tz(config.timezone).format('DD/MM/YYYY HH:mm:ss');
    },

    // Cek level user
    isOwner(jid) {
        return jid.replace('@s.whatsapp.net', '') === config.ownerNumber;
    },

    isReseller(level) {
        return ['reseller', 'owner'].includes(level);
    },

    // Format nomor
    formatPhone(phone) {
        return phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
    },

    getNumber(jid) {
        return jid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    },

    // Format saldo
    formatSaldo(saldo) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(saldo);
    },

    // Sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Capitalize
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }
};

module.exports = utils;
