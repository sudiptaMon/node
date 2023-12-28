const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    productdata.find({}).toArray().then((response) => {

        admindata.findOne({ "username": req.session.username }).then((user) => {
            res.render('index', { product: response, user: user });
        })
    })
})
router.get('/addproduct', (req, res) => {
    res.render('addproduct');
})

module.exports = router;