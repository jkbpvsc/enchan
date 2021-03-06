"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const socketIO = require("socket.io");
const crypto = require("crypto");
const crypto_1 = require("crypto");
const Message_1 = require("./Message");
let io;
const connectionPool = [];
function init(server) {
    console.log('Starting socket.io server');
    io = socketIO.listen(server);
    attachHandlers();
}
exports.init = init;
function removeFromPool(connection) {
    for (let i = 0; i < connectionPool.length; i++) {
        if (connection.id === connectionPool[i].id) {
            connectionPool.splice(i, 1);
            return;
        }
    }
}
function attachHandlers() {
    io.on('connection', (socket) => {
        const con = new Client(socket, io);
        connectionPool.push(con);
        socket.on('disconnect', () => {
            con.roomMessage(`${con.alias} disconnected`);
            removeFromPool(con);
        });
    });
}
function getRoomMembers(room) {
    return connectionPool.filter(sc => sc.room === room);
}
function generateRoomID() {
    return crypto_1.randomBytes(4).toString('hex');
}
exports.generateRoomID = generateRoomID;
class Client {
    constructor(socket, io) {
        this.nick = '';
        this.id = 'u' + crypto.randomBytes(4).toString('hex');
        this.room = "";
        this.socket = socket;
        this.io = io;
        this.init();
    }
    get alias() {
        return (this.nick != '' ? this.nick : this.id);
    }
    set alias(alias) {
        this.nick = alias;
    }
    init() {
        this.socket.on('room', this.joinRoom.bind(this));
        this.socket.on('message', this.handleMessage.bind(this));
        this.socket.on('nick', this.changeAlias.bind(this));
    }
    changeAlias(alias) {
        if (!alias) {
            return this.clientMessage('Nickname missing');
        }
        this.roomMessage(`${this.alias} changed nickname to ${alias}`);
        this.alias = alias;
    }
    joinRoom(data) {
        this.room = data.room;
        this.socket.join(this.room);
        this.socket.emit('meta', { connections: getRoomMembers(this.room).length });
        this.roomMessage(`${this.alias} connected`);
    }
    roomMessage(message) {
        const messageObject = new Message_1.default({ message });
        messageObject.setAuthor(`room`);
        messageObject.validate();
        this.sendMessage(messageObject);
    }
    clientMessage(message) {
        const messageObject = new Message_1.default({ message });
        messageObject.setAuthor(`room`);
        messageObject.validate();
        this.sendMessage(messageObject);
    }
    handleMessage(socketData, author = this.alias) {
        if (this.room !== "") {
            const message = new Message_1.default(socketData);
            message.setAuthor(author);
            message.validate();
            this.sendMessage(message);
        }
    }
    sendMessage(message, scoketMessage = false) {
        if (message.valid) {
            let recipient = this.socket;
            if (scoketMessage) {
                recipient = this.socket;
            }
            else {
                recipient = this.io.to(this.room);
            }
            recipient.send(message.render());
        }
    }
}
