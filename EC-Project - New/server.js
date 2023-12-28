const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const client = require('mongodb').MongoClient;
const multer = require("multer");
const time = 1000 * 24 * 60 * 60;
const { ObjectId } = require('mongodb');

let listinstance;
let userdata;
let productdata;
let admindata;
let orderdata;

client.connect("mongodb://localhost:27017").then((database) => {
    listinstance = database.db('E_Com');
    userdata = listinstance.collection('userlist');
    productdata = listinstance.collection('product');
    admindata = listinstance.collection('admin-users');
    orderdata = listinstance.collection('orders');
}).catch((err) => {
    console.log(err);
})

app.set("view engine", "ejs");
app.use(express.urlencoded());
app.use(cookieParser());
app.use(
    session({
        saveUninitialized: true,
        resave: false,
        secret: "abcdefghij",
        cookie: { maxAge: time },
    })
);



app.get('/', (req, res) => {
    // console.log(req.session.username);
    // console.log(req.session.position);
    // req.session.cart=[];
    productdata.find({}).toArray().then((response) => {

        userdata.findOne({ "username": req.session.username }).then((user) => {
            res.render('index', { product: response, user: user });
        })
    })
})

app.get('/admin', (req, res) => {
    console.log(req.session.username);
    console.log(req.session.position);
    productdata.find({}).toArray().then((response) => {

        admindata.findOne({ "username": req.session.username }).then((user) => {
            res.render('index', { product: response, user: user });
        })
    })
})


app.use(express.static('.'));


app.get("/login", (req, res) => {
    res.render("login", { message: "", message1: "" });
});

app.get("/signup", (req, res) => {
    res.render("signUp", { massage: "" });
});

app.post("/login/user", (req, res) => {

    userdata.find({ $and: [{ "username": req.body.username }, { "password": req.body.password }] }).toArray().then((response) => {
        if (response.length == 0) {
            res.render("login", {
                message: "Invalid username/password",
                message1: "",
            });
        }
        else {
            req.session.username = req.body.username;
            req.session.position = "user";
            res.redirect('/');
        }
    })
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./uploads/user");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});
const upload = multer({ storage });


app.post("/signup", upload.single("file"), (req, res) => {
    // console.log("req-body", req.body);
    var uname = req.body.username.trim();
    if (!uname) {
        res.render("signUp", { massage: "Enter valid info." })
    } else {


        let obj = {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            position: "user",
            cart: [],
            favorite: [],
            url: "/uploads/user/" + req.file.filename
        }
        userdata.find({ "username": req.body.username }).toArray().then((response) => {
            if (response.length == 0) {

                req.session.username = req.body.username;
                req.session.position = "user";
                userdata.insertOne(obj).then((u) => {
                    let oobj = {
                        userid: u.insertedId,
                        username: req.body.username,
                        orders: []
                    }
                    orderdata.insertOne(oobj);
                    // console.log(u);
                    res.redirect('/');
                });

            } else {

                res.render("login", {
                    message: "",
                    message1: "Already an user, please login..",
                });
            }
        })
    }
});



app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.get('/changepassword', (req, res) => {
    // console.log(req.session.username);
    if (req.session.username) {
        res.render('changepassword', { message: "" });
    } else {
        res.redirect('/login');
    }
})



app.post('/changepassword', (req, res) => {
    let username = req.session.username;
    if (!req.session.position) {

        userdata.findOne({ "username": username }).then((response) => {
            if (req.body.newpass1 !== req.body.newpass2 || response.password !== req.body.oldpass) {
                res.render("changepassword", { message: "Password dose not match" });
            } else {
                userdata.updateOne({ "username": username }, { $set: { "password": req.body.newpass1 } });
                res.redirect('/');
            }
        })
    } else {
        admindata.findOne({ "username": username }).then((response) => {
            if (req.body.newpass1 !== req.body.newpass2 || response.password !== req.body.oldpass) {
                res.render("changepassword", { message: "Password dose not match" });
            } else {
                admindata.updateOne({ "username": username }, { $set: { "password": req.body.newpass1 } });
                res.redirect('/admin');
            }
        })

    }

})

app.get('/deleteaccount', (req, res) => {
    if (req.session.username) {
        res.render("delete", { message: "" });
    } else {
        res.redirect('/');
    }
})


app.post('/deleteaccount', (req, res) => {
    let username = req.session.username;
    userdata.findOne({ "username": username }).then((response) => {
        if (req.body.pass1 !== req.body.pass2 || response.password !== req.body.pass1) {
            res.render('delete', { message: "Password dose not match" });
        } else {
            userdata.deleteOne({ "username": username });
            req.session.destroy();
            console.log("Deleted");
            res.redirect('/');
        }
    })

})

// app.get('/singleproduct', (req, res) => {

//     productdata.find({}).toArray().then((response) => {
//         productdata.find({ "id": req.query.id }).toArray().then((obj) => {
//             res.render('product', { product: obj, username: req.session.username, all: response, url: "/uploads/" + req.session.username + ".jpg" });
//         })
//     })
// })

app.get('/product', (req, res) => {

    productdata.find({}).toArray().then((response) => {
        productdata.find({ "_id": new ObjectId(req.query.id) }).toArray().then((obj) => {
            userdata.findOne({ "username": req.session.username }).then((user) => {

                res.render('product', { product: obj, user: user, all: response });
            })
        })
    })

})

app.get('/cart', (req, res) => {
    if (req.session.username && req.session.position !== "admin") {
        userdata.findOne({ "username": req.session.username }).then((response) => {
            let result = response.cart;
            res.render('cart', { product: result, user: response });
        })
    } else {
        res.render('cart', { product: req.session.cart, user: "" });
    }
})
app.get('/favorite', (req, res) => {
    if (req.session.username) {
        userdata.findOne({ "username": req.session.username }).then((response) => {
            let result = response.favorite;
            res.render('favorite', { product: result, user: response });
        })
    } else {
        res.redirect('/login');
    }
})



app.get('/removefromcart', (req, res) => {
    if (req.session.username) {

        userdata.findOne({ "username": req.session.username }).then((response) => {
            let cart = response.cart;
            let data = cart.filter((item) => {
                return item.id != req.query.id;
            })
            userdata.updateOne({ "username": req.session.username }, { $set: { "cart": data } });
            res.redirect('/cart');
        })
    } else {
        res.redirect('/login');
    }
})
app.get('/removefromfavorite', (req, res) => {
    if (req.session.username) {

        userdata.findOne({ "username": req.session.username }).then((response) => {
            let favorite = response.favorite;
            let data = favorite.filter((item) => {
                return item.id != req.query.id;
            })
            userdata.updateOne({ "username": req.session.username }, { $set: { "favorite": data } });
            res.redirect('/favorite');
        })
    } else {
        res.redirect('/login');
    }
})


app.get('/addtocart', (req, res) => {
    if (req.session.username) {

        userdata.findOne({ "username": req.session.username }).then((response) => {
            productdata.findOne({ "_id": new ObjectId(req.query.id) }).then((response1) => {
                let prevdata = response.cart;

                let result = prevdata.filter((item) => {
                    return item.id != response1.id;
                })
                result.push(response1);
                userdata.updateOne({ "username": req.session.username }, { $set: { "cart": result } });
                res.redirect('/cart');
            })
        })
    } else {
        productdata.findOne({ "_id": new ObjectId(req.query.id) }).then((response1) => {
            let prevdata;
            if (req.session.cart) {

                prevdata = req.session.cart;
            } else {
                prevdata = [];
            }

            // let result = prevdata.filter((item) => {
            //     return item.id != response1.id;
            // })
            prevdata.push(response1);
            req.session.cart = prevdata;
            res.redirect('/cart');
        })
    }

})


app.get('/addtofavorite', (req, res) => {
    if (req.session.username) {

        userdata.findOne({ "username": req.session.username }).then((response) => {
            productdata.findOne({ "_id": new ObjectId(req.query.id) }).then((response1) => {
                let prevdata = response.favorite;

                let result = prevdata.filter((item) => {
                    return item.id != response1.id;
                })
                result.push(response1);
                userdata.updateOne({ "username": req.session.username }, { $set: { "favorite": result } });
                res.redirect('/favorite');
            })
        })
    } else {
        res.redirect("/login");
    }

})


app.get('/profile', async (req, res) => {
    if (req.session.username) {
        if (req.session.position == "user") {

            let user = await userdata.findOne({ "username": req.session.username });
            res.render('profile', { user: user });
        } else if (req.session.position == "admin") {
            let user = await admindata.findOne({ "username": req.session.username });
            res.render('profile', { user: user });
        }
    } else {
        res.redirect('/login');
    }
})


app.get("/buy", async (req, res) => {
    if (req.session.username) {
        let user = await userdata.findOne({ username: req.session.username });
        res.render('buy', { user: user, productId: new ObjectId(req.query.id) });
    } else {
        res.redirect('/login');
    }
})

app.post('/payment', async (req, res) => {
    if (req.session.username) {
        let { firstname, lastname, address, country, zipcode, city, state, phone } = req.body;

        let add = {
            name: firstname + " " + lastname,
            address: address,
            country: country,
            zipcode: zipcode,
            city: city,
            state: state,
            phone: phone
        }
        let user = await userdata.findOne({ username: req.session.username });
        let product = await productdata.findOne({ "_id": new ObjectId(req.query.id) });
        req.session.address = add;
        res.render("payment", { user: user, product: product });
    } else {
        res.redirect('/login');
    }

})

// app.post('/orderplaced', async (req, res) => {
//     let user = await userdata.findOne({ "username": req.session.username });
//     let product = await productdata.findOne({ "_id": new ObjectId(req.query.id) });
//     let orders = user.orders;
//     product.address = req.session.address;
//     orders.push(product);
//     userdata.updateOne({ "username": req.session.username }, { $set: { "orders": orders } }).then((response) => {
//         console.log(response);
//         console.log(orders);
//     res.render('orderplaced', { user: user });
//     });
// })

app.post('/orderplaced', async (req, res) => {
    let user = await userdata.findOne({ "username": req.session.username });
    let product = await productdata.findOne({ "_id": new ObjectId(req.query.id) });
    product.address = req.session.address;
    let orderDetails = await orderdata.findOne({ "userid": new ObjectId(user._id) });
    let prevOrders = orderDetails.orders;
    prevOrders.push(product);
    orderdata.updateOne({ "userid": new ObjectId(user._id) }, { $set: { "orders": prevOrders } }).then((response) => {
        console.log(response);
        res.render('orderplaced', { user: user });
    })
})

app.get('/admin/orders', async (req, res) => {
    let user = await admindata.findOne({ "username": req.session.username });
    let all = await orderdata.find({}).toArray();
    let orders = all.filter((item) => {
        if (item.orders.length !== 0) {
            return true;
        }
    })
    res.render('adminorder', { user: user, orders: orders });
})
app.get('/orders', async (req, res) => {
    // console.log(req.session.username);
    // console.log(req.session.position);
    if (req.session.username && req.session.position == "user") {
        let user = await userdata.findOne({ _id: new ObjectId(req.query.id) });
        let orderDetails = await orderdata.findOne({ userid: new ObjectId(req.query.id) });
        let product = orderDetails.orders;
        res.render('orders', { user: user, product: product });
    } else {
        res.redirect('/login');
    }

})

app.get('/category', async (req, res) => {
    if (req.session.username) {
        let user = await userdata.findOne({ "username": req.session.username });
        let product = await productdata.find({ "category": req.query.category }).toArray();
        res.render('index', { product: product, user: user });
    } else {
        res.redirect('/login');
    }

})

const profile = multer.diskStorage({
    destination: function (req, file, cb) {
        if(req.session.position==="user"){

            cb(null, "./uploads/user");
        }else{
            cb(null, "./uploads/admin");

        }
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});
const saveprof = multer({ storage: profile });

app.post('/saveprofile', saveprof.single("profileImage"), async (req, res) => {
    // console.log(req.body.username + " " + req.body.email);
    let username = req.session.username;
    let position = req.session.position;
    // console.log(username);
    // console.log(position);
    
    if (position === "user") {
        if (req.file) {
            await userdata.updateOne({ "username": username }, { $set: { "url": "/uploads/user/" + req.file.filename } });
        }
        if (req.body.username) {
            await userdata.updateOne({ "username": username }, { $set: { "username": req.body.username } });
            req.session.username = req.body.username;
        }
        if (req.body.email) {
            await userdata.updateOne({ "username": username }, { $set: { "email": req.body.email } });

        }
    } else if (position === "admin") {
        if (req.file) {

            await admindata.updateOne({ "username": username }, { $set: { "url": "/uploads/admin/" + req.file.filename } });
        }
        if (req.username) {
            await admindata.updateOne({ "username": username }, { $set: { "username": req.body.username } });
        }
    }
    res.redirect('/profile');
})


app.get('/admin/login', (req, res) => {
    res.render('adminlogin', { message: "", message1: "" })
})
app.post('/admin/login', (req, res) => {
    admindata.find({ $and: [{ "username": req.body.username }, { "password": req.body.password }] }).toArray().then((response) => {
        if (response.length == 0) {
            res.render("adminlogin", {
                message: "Invalid username/password",
                message1: "",
            });
        }
        else {
            req.session.username = req.body.username;
            req.session.position = 'admin';
            res.redirect('/admin');
        }
    })
})

app.get('/admin/editproduct', async (req, res) => {
    let user = await admindata.findOne({ username: req.session.username });
    let product = await productdata.find({}).toArray();
    console.log(product[0]);
    if (req.session.username && req.session.position === "admin") {
        res.render('editproduct', { user: user, product: product });
    } else {
        res.redirect('/admin/login');
    }
})
const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/product/');
    },
    filename: function (req, file, cb) {
        cb(null, req.body.productname + ".jpg");
    }
})

const product = multer({ storage: storage2 });
app.post('/addproduct', product.single("image"), async (req, res) => {
    let p = await productdata.find({}).toArray();
    const obj = {
        id: p.length + 1,
        name: req.body.productname,
        image: "/uploads/product/" + req.body.productname + ".jpg",
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        sub_category: req.body.sub_category
    }
    productdata.insertOne(obj).then(() => {
        res.redirect('/admin/editproduct');
    })
})




app.listen(3000, () => {
    console.log("server started");
});
