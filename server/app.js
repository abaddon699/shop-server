
"use strict";
     
const jsonServer = require('json-server');
const DB = require('./db');
const config = require('./config');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const app = jsonServer.create();
const router = jsonServer.router('db.json');
const db = new DB();
const fileupload = require('express-fileupload');
var fs = require('fs');
      
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const middlewares = jsonServer.defaults();
app.use(fileupload());
app.use(middlewares);

app.post('/register', async (req, res) => { //registering user
    var inserted = await db.insert([
        req.body.name,
        bcrypt.hashSync(req.body.password, 8),
    ]);

    if(inserted) //login user
    {
        var user = await db.selectByName(req.body.name);
        let token = jwt.sign({ name: user.id }, config.secret, {
            expiresIn: 86400 // expires in 24 hours
        });
        res.status(200).send({ auth: true, token: token, user: user });
    }
    else
        res.status(500).send("There was a problem registering the user."); 
});

app.post('/login', async (req, res) => { //login user
    var user = await db.selectByName(req.body.name);
    if(user == undefined) return res.status(404).send('No user found.');      

    let passwordIsValid = bcrypt.compareSync(req.body.password, user['password']);
    if (!passwordIsValid) return res.status(401).send({ auth: false, token: null });

    let token = jwt.sign({ name: user.id }, config.secret, {
        expiresIn: 86400 // expires in 24 hours 86400
    });
    res.status(200).send({ auth: true, token: token, user: user });
});

app.post('/fileUp', async (req, res) => { // add photo to base
    const image = req.files.imagePost;
    const path = __dirname + '/data/pic/' + image.name + ".jpg";
        
    image.mv(path, (error) => {
        if (error) {
            res.writeHead(500, {
                'Content-Type': 'application/json'
            })
            res.end(JSON.stringify({ status: 'error', message: error }));
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({ status: 'success', path: '/data/pic/' + image.name + ".jpg"}));
    })
});

app.get("/username", async (req, res) => { // give user his nickname to display
    if (req.headers && req.headers.authorization) {
        var nameID = getName(req.headers, res);
        if(nameID==null)
            return res.status(401).send('unauthorized');
        var name = await db.getUser(nameID);
            return res.send({id: name});
        }
        return res.send(500);
})

app.post('/purchase', async (req, res) => {// user make purchase
    if (req.headers && req.headers.authorization) {
        var name = getName(req.headers, res);
        if(name==null)
            return res.status(401).send('unauthorized');
        var cart = await db.deleteItems(name);
        //var filePath = __dirname + '/data/pic/' + req.query.image;
        //fs.unlink(filePath)
        return res.send({newCart: cart});;
    }
    return res.sendStatus(500);
});

app.post("/addToCart", async (req, res) => {// add item to users cart
    if (req.headers && req.headers.authorization) 
    {
        var name = getName(req.headers, res);
        if(name==null)
            return res.status(401).send('unauthorized');
        var cartUpdate = [name, req.body.id];
        await db.updateUserCart(cartUpdate);
        return res.send(200);
    }
    return res.send(500);
});

app.post("/deleteFromCart", async (req, res) => {// delete item from users cart
    if (req.headers && req.headers.authorization) 
    {
        var name = getName(req.headers, res);
        if(name==null)
            return res.status(401).send('unauthorized');
        var cartUpdate = [name, req.body.id];
        await db.delFromCart(cartUpdate);
        return res.send(200);
    }
    return res.send(500);
});

app.post("/regItem", async (req, res) => { // give user his cart to display
    await db.regItem(req.body);
    res.sendStatus(200);
})

app.get("/items", async (req, res) => { // give user his cart to display
    var data = await db.shop(req.query.limitForPage, req.query.page);
    res.send(data);
})

app.get("/cart", async (req, res) => { // give user his cart to display
    if (req.headers && req.headers.authorization) 
    {
        var name = getName(req.headers, res);
        if(name==null)
            return res.status(401).send('unauthorized');
        var cart = await db.getCart(name);
        res.send({newCart: cart});
    }    
})

app.get("/image", (req, res) => {// give item image to user
    var filePath = __dirname + '/data/pic/' + req.query.image;
    fs.readFile(filePath, function read(err, data) {
        if (err) {
            throw err;
        }
        const content = data;
                    
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': content.length
        });
        res.end(content);
    });
})

function getName(header)// get user id from jwt
{   
    var authorization = header.authorization.split(' ')[0],
    decoded;
    try {
        decoded = jwt.verify(authorization, config.secret);
    } catch (e) {
        throw err;
    }
    return decoded.name;
}

app.use(router)
let port = process.env.PORT || 4000;
let server = app.listen(port, function () {
    console.log('Server listening on port ' + port)
});