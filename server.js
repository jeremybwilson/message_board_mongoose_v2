const parser = require('body-parser');
const color = require('colors');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const flash = require('express-flash');
const session = require('express-session');
const {Schema} = mongoose;

const port = process.env.PORT || 8000;
// invoke express and store the result in the variable app
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'static')));
app.set('views', path.join(__dirname, 'views'));

app.use(parser.urlencoded({ extended: true }));
app.use(parser.json());
app.use(flash());
app.use(session({
    secret:'superSekretKitteh',
    resave: false,
    saveUninitialized: false,
    cookie: {secure: false, maxAge: 60000}
}));

//mongodb connection
mongoose.connect('mongodb://localhost:27017/messageboard_db', { useNewUrlParser: true });
mongoose.connection.on('connected', () => console.log('MongoDB connected'));

//schemas
const CommentSchema = new mongoose.Schema({
    signature: {
        type: String,
        required: [true, 'A name is required'],
        minlength: 3,
        trim: true
    },
    comment: {
        type: String,
        required: [true, 'Please enter a comment'],
        minlength: [5, 'Make your message longer than 5 characters'],
        trim: true
    },
}, {timestamps: true});
const Comment = mongoose.model('Comment', CommentSchema);

const MessageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A name is required'],
        trim: true
    },
    message: {
        type: String,
        required: [true, 'Please write a message'],
        minlength: [5, 'Make your message longer than 5 characters'],
        trim: true
    },
    comments: [CommentSchema],
}, {timestamps: true});
// }, {timestamps: {createdAt:'created_at', updatedAt:false}});
const Message = mongoose.model('Message', MessageSchema);

mongoose.model('Message', MessageSchema); // We are setting this Schema in our Models as 'Message'
mongoose.model('Comment', CommentSchema); // We are setting this Schema in our Models as 'User'

app.listen(port, () => console.log(`Express server listening on port ${port}`));

//routing
app.get('/', (request,response) => {
    Message.find({}).sort('-createdAt')
        .then((all_messages) => {
            const messages = all_messages;
            response.render('index', { messages, title: 'Message Board home page' });
        })
        .catch(error => {
            console.log(`there was an error: ${error}`)
        })
    response.render('index', { title: 'Message Board home page'});
});

//post new message
app.post('/message', (request,response) => {
    Message.create(request.body)
        .then(() => {
            Message.find({}).sort('-createdAt')
                .then((all_messages) => {
                    const all_msgs = all_messages;
                    response.json({messages:all_msgs, code:201});
                })
                .catch(error => {
                    console.log(`there was an error: ${error}`)
                })
        })
        .catch(error => {
            let all_errors = [];
            for (let key in error.errors) {
                all_errors.push(error.errors[key].message)
            }
            response.json({errors:all_errors, code:406});
        });
});

//post comment
app.post('/comment/:_id', (request,response) => {
    Comment.create(request.body)
        .then((comment) => {
            Message.findOneAndUpdate({ _id:request.params._id }, {$push:{ comments:comment }})
                .then(() => {
                    console.log(color.magenta(`successfully added: ${comment}`))
                })
                .catch(error => {
                    console.log(color.blue(`there was an error: ${error}`));
                })
        })
        .catch(error => {
            let all_errors = [];
            for (let key in error.errors) {
                all_errors.push(error.errors[key].message)
            }
            response.json({errors:all_errors, code:406});
        });
});

// catch 404 and forward to error handler
app.use((request, response, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use((err, request, response, next) => {
    // set locals, only providing error in development
    response.locals.message = err.message;
    response.locals.error = request.app.get('env') === 'development' ? err : {};
    response.status(err.status || 500);
    // render the error page
    response.render('error', {title: 'Error page'});
  });

// app.listen(port, () => console.log(`Express server listening on port ${port}`));    // ES6 way