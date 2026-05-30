const express = require('express');
const app = express();
const connectDB = require("./config/db");
const routers = require("./Route/index.js");
// const logger = require("morgan");
require('dotenv').config();

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
app.use('/category/', routers.category);
app.use('/product/', routers.product);
app.use('/product-detail/', routers.productDetail);
app.use('/brand/', routers.brand);

// app.use('/bill/', routes.crudA);



const PORT = process.env.PORT 
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));