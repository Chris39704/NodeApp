require('./config/config');

// 3rd Party Modules
const express = require('express');
const _ = require('lodash');
const { ObjectID } = require('mongodb');
const bodyParser = require('body-parser');
const path = require('path');
const socketIO = require('socket.io');
const moment = require('moment');

const http = require('http');
// const https = require('https');

const app = express();
const port = process.env.PORT;
const host = process.env.ENV_HOST;

// My Modules
const { mongoose } = require('./db/mongoose');
const { Todo } = require('./models/todo');
const { User } = require('./models/user');
const { authenticate } = require('./middleware/authenticate');
const { generateMessage } = require('./chat/message');
const { isRealString } = require('./middleware/validation');
const { Users } = require('./chat/users');

const server = http.createServer(app);
const io = socketIO(server);
const users = new Users();
let msgArray = [];
let clearFlag = 0;


app.use(bodyParser.json());

const myPath = path.join(__dirname, '../public');
app.use(express.static(myPath));

io.on('connection', (socket) => {

    socket.on('join', (params, callback) => {
        if (!isRealString(params.name) || !isRealString(params.room)) {
            return callback('Name and Room are required.');
        }

        const formattedTime = moment().format('h:mm a');
        params.room = params.room.toUpperCase();

        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room);
        io.to(params.room).emit('updateUserList', users.getUserList(params.room));
        const user = users.getUser(socket.id);

        console.log(`${params.name} ${socket.handshake.address} Connected: ${formattedTime}`);
        socket.emit('newMessage', generateMessage('Chat Bot:', `Welcome to Chat App ${user.name}!`));
        socket.broadcast.to(params.room).emit('newMessage', generateMessage('Chat Bot:', `${user.name} joined the channel.`));
        return callback();
    });

    socket.on('createMessage', (message, callback) => {
        const user = users.getUser(socket.id);
        let socketVar = socket.id.toString();
        // sending to individual socketid (private message)
        //socket.to(<socketid>).emit('hey', 'I just met you');

        if (user && isRealString(message.text)) {

            io.to(user.room).emit('newMessage', generateMessage((user.name + ':'), message.text));
            // console.log(socket.handshake.address);
        }

        callback();
    });

    socket.on('disconnect', () => {
        const formattedTime = moment().format('h:mm a');

        const user = users.removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('updateUserList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Chat Bot:', `${user.name} has left.`));
            console.log(`${user.name} ${socket.handshake.address} Disconnected: ${formattedTime}`);
        }
    });
});

app.post('/todos', authenticate, async (req, res) => {
    try {
        const todo = await new Todo({
            text: req.body.text,
            _creator: req.user._id,
        });

        todo.save().then((doc) => {
            res.send(doc);
        }, (e) => {
            res.status(400).send(e);
        });
    } catch (e) {
        throw new Error('Invalid Todo.');
    }
});

app.get('/todos', authenticate, async (req, res) => {
    try {
        const todos = await Todo.find({
            _creator: req.user._id,
        });
        return res.send({ todos });
    } catch (e) {
        return res.status(400).send(e);
    }
});

app.get('/todos/:id', authenticate, async (req, res) => {
    const { id } = req.params;

    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    try {
        const todo = await Todo.findOne({
            _id: id,
            _creator: req.user._id,
        });
        if (!todo) {
            return res.status(404).send();
        }

        return res.send({ todo });
    } catch (e) {
        return res.status(400).send();
    }
});


app.delete('/todos/:id', authenticate, async (req, res) => {
    const { id } = req.params;

    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    try {
        const todo = await Todo.findOneAndRemove({
            _id: id,
            _creator: req.user._id,
        });
        if (!todo) {
            return res.status(404).send();
        }

        return res.send({ todo });
    } catch (e) {
        return res.status(400).send();
    }
});

app.patch('/todos/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const body = _.pick(req.body, ['text', 'completed']);

    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    if (_.isBoolean(body.completed) && body.completed) {
        body.completedAt = new Date().getTime();
    } else {
        body.completed = false;
        body.completedAt = null;
    }

    try {
        const todo = await Todo.findOneAndUpdate({ _id: id, _creator: req.user._id }, { $set: body }, { new: true });
        if (!todo) {
            return res.status(404).send();
        }
        return res.send({ todo });
    } catch (e) {
        return res.status(400).send();
    }
});
// POST /users
app.post('/users', async (req, res) => {
    try {
        const body = _.pick(req.body, ['email', 'password']);
        const user = new User(body);
        await user.save();
        const token = await user.generateAuthToken();
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send(e);
    }
});

app.get('/users/me', authenticate, async (req, res) => {
    await res.send(req.user);
});

app.post('/users/login', async (req, res) => {
    try {
        const body = _.pick(req.body, ['email', 'password']);
        const user = await User.findByCredentials(body.email, body.password);
        const token = await user.generateAuthToken();
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send();
    }
});

app.delete('/users/me/token', authenticate, async (req, res) => {
    try {
        await req.user.removeToken(req.token);
        res.status(200).send();
    } catch (e) {
        res.status(400).send();
    }
});

// const server = app.listen(port, hostname, () => {
//   console.log(`Server running at http://${hostname}:${port}/`);
// });

server.listen(port, host, () => {
    console.log(`Server Listening on ${host}:${port}`);
});

module.exports = { app };
