"use strict";
const axios = require('axios');
var database;
class Db {
    async selectByName(name) { // get user data
        var user = await axios.get('http://localhost:4000/users?name=' + name)
        user = user.data[0];
        return user;
    }

    async insert(user) {  //register user
        var name = await axios.get('http://localhost:4000/users?name=' + user[0]);
        if(name.data[0] != undefined) return false;
        var send = {name: user[0], type: "user", password: user[1], cart: ""};
        axios.post('http://localhost:4000/users', send );
        return true;
    }

    async getUser(user) { //get user name
        var name = await axios.get('http://localhost:4000/users/' + user);
        return name.data.name;
    }

    async updateUserCart(data){  // add item to user's cart
        var cart = await axios.get('http://localhost:4000/users/' + data[0]);
        cart = cart.data.cart;
        cart = cart.split(',');
        var add=true;
        //check if item is in cart
        for(var i =0; i<cart.length; i++)
        {
            if(cart[i]==data[1])
            {
                add=false;
                break;
            }
        }
        if(add) // if item is not in cart, add it
        {
            if(cart.length == 1, cart[0]=="")
                cart[0]=data[1];
            else
                cart.push(data[1]);
            var newCart = cart.join();
            var send = {"cart": newCart};
            axios.patch('http://localhost:4000/users/'+data[0], send);
        }
    }

    async deleteItems(user) //user purchased his cart
    {
        var cart = await axios.get('http://localhost:4000/users/' + user);
        cart = cart.data.cart;
        cart = cart.split(',');
        cart.forEach(async cartID => {
            await axios.delete('http://localhost:4000/shop/' + cartID);
        });
        var send = {"cart": ""};    
        await axios.patch('http://localhost:4000/users/'+user, send);
        return send;
    }

    async getCart(user){ // get user cart
        var cart = await axios.get('http://localhost:4000/users/' + user);
        cart = cart.data.cart;    
        cart = cart.split(',').map(Number);
        database = await axios.get('http://localhost:4000/shop');
        database = database.data;
        var newCart = [];
        cart.forEach(item => {
            for(var i=0; i<database.length; i++)
            {
                if(database[i]["id"] == item)
                {
                    newCart.push({"id": database[i].id, "name": database[i].name, "desc": database[i].desc, "price": database[i].price, "img": database[i].img});
                    break;
                }
            }
        });
        return newCart;
    }

    async delFromCart(data){// user deleted item from cart
        var cart = await axios.get('http://localhost:4000/users/' + data[0]);
        cart = cart.data.cart;
        cart = cart.split(',').map(Number);
        if(cart.length != undefined)
        {
            const index = cart.indexOf(data[1]);
            if (index > -1) 
                cart.splice(index, 1);
        }
        var newCart; //creating new cart for json
        if(cart.length==0)
            newCart="";
        else
            var newCart = cart.join();
        var send = {"cart": newCart};    
        await axios.patch('http://localhost:4000/users/'+data[0], send);
        return cart;
    }

    async regItem(data){// add item to shop
        axios.post('http://localhost:4000/shop', data);
    }

    async shop(limit, page){// add item to shop
        if(limit!=0)
        {
            const res = await axios.get('http://localhost:4000/shop?_limit=' + limit + "&_page=" + page);
            this.totalCount = res.headers["x-total-count"];
            return {items: res.data, count: Math.round(this.totalCount/limit)};
        }
        else
        {
            const res = await axios.get('http://localhost:4000/shop');
            return {items: res.data, count: 0};
        }
    }
}

module.exports = Db
