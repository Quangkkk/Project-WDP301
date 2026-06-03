// const reservations = require('./reservations.route.js');
const user = require('./user.route.js');
const product = require('./product.route.js');
const productDetail = require('./productDetail.route.js');
const category = require('./category.route.js');
const brand = require('./brand.route.js');
const payment = require('./payment.router.js')
// const bill = require('./bill.route.js');


// const routes = {}

//     routes.user = user
//     routes.product = product
//     routes.productDetail = productDetail
//     routes.category = product
//     routes.brand = product



module.exports = {
    user,
    product,
    productDetail,
    category,
    brand,
    payment
};
