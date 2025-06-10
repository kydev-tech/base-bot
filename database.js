const mongoose = require('mongoose');
const config = require('./config');
const chalk = require('chalk');

// Schema User
const userSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    level: { 
        type: String, 
        enum: ['guest', 'reseller', 'owner'], 
        default: 'guest' 
    },
    saldo: { type: Number, default: 0 },
    isRegistered: { type: Boolean, default: false },
    registeredAt: { type: Date, default: null },
    lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

// Schema Group
const groupSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    welcome: { type: Boolean, default: false },
    antilink: { type: Boolean, default: false }
}, { timestamps: true });

// Models
const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);

// Database Functions
const db = {
    async connect() {
        try {
            await mongoose.connect(config.mongodb);
            console.log(chalk.green('✅ Database berhasil terhubung'));
        } catch (error) {
            console.log(chalk.red('❌ Database gagal terhubung:', error.message));
            process.exit(1);
        }
    },

    // User Functions
    async getUser(jid) {
        return await User.findOne({ jid });
    },

    async addUser(jid, name) {
        const user = new User({ jid, name, isRegistered: true, registeredAt: new Date() });
        return await user.save();
    },

    async updateUser(jid, data) {
        return await User.findOneAndUpdate({ jid }, data, { new: true });
    },

    async addSaldo(jid, amount) {
        return await User.findOneAndUpdate(
            { jid }, 
            { $inc: { saldo: amount } }, 
            { new: true }
        );
    },

    async setLevel(jid, level) {
        return await User.findOneAndUpdate(
            { jid }, 
            { level }, 
            { new: true }
        );
    },

    // Group Functions
    async getGroup(jid) {
        return await Group.findOne({ jid });
    },

    async addGroup(jid, name) {
        const group = new Group({ jid, name });
        return await group.save();
    },

    async updateGroup(jid, data) {
        return await Group.findOneAndUpdate({ jid }, data, { new: true });
    }
};

module.exports = { db, User, Group };
