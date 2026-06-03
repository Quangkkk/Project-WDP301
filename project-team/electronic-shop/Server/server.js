const express = require('express');
const path = require('path');
const app = express();
const {connectDB} = require('./Model/index.js');
const routers = require("./Route/index.js");
// const logger = require("morgan");
require('dotenv').config({ path: path.join(__dirname, '.env') });

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://localhost:5173',
    'https://127.0.0.1:5173',
];

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());
// app.use(logger("dev"));

connectDB();

app.get('/', async(req, res)=>{
    try {
        res.send({message: 'Welcome to Back-end App! This will communicate other App with JSON'});
    } catch (error) {
        res.send({error: error.message});
    }
});

app.get("/", (req, res) => res.send("Welcome to Court Management System"));

app.use('/user/', routers.user);
app.use('/category/', routers.category); //done
app.use('/product/', routers.product);
app.use('/product-detail/', routers.productDetail);
app.use('/brand/', routers.brand);
app.use('/payment/', routers.payment);


// app.use('/bill/', routes.crudA);



const PORT = process.env.PORT 
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
