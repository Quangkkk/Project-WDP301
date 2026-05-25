const { default: mongoose } = require('mongoose');
const db = require('../Model/index.js');
const Product = db.product

// Create a USER
const addProduct = async (req, res) => {
    try {

        //\\Get data from req.body
        const body = req.body;// console.log("\x1b[32m%s\x1b[0m","USER_DATA: ", body);

        //\\Check req data
        if (!body) {
            // console.log({ERROR: 'Require user body!'})
            return res.status(400).send({ ERROR: 'Require user data!' })
        }

          //\\Check req params
        if (!body.category_id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require category_id!' })
        }

        //\\Validate Mongo ObjectId
        if (!mongoose.isValidObjectId(body.category_id)) {
            return res.status(400).send({ ERROR: 'Invalidate id:', id: body.category_id });
        }

        //\\Initialize new USER + Save USER to database
        const dataDB = await new Product(body).save();// console.log("\x1b[32m%s\x1b[0m","USER: ", dataDB);

        //\\Validate data
        //convert mongo document to a plain-old JavaScript object 
        const data = dataDB.toObject()
        //delete attribute
        delete data.createdAt;
        delete data.updatedAt;
        delete data.__v

        //\\RESPONSE
        return res.status(201).send({ message: 'Create successfully!', data: data });
    } catch (error) {
        return res.status(500).send({ ERROR: error.message, data });
    }
}


// Read one USER by id && Include related COUNTRY && AREA
const getProductById = async (req, res) => {
    try {

        //\\Get id from req.params
        const id = req.params.id;   // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require ProductId!' })
        }

        //\\Validate Mongo ObjectId
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send({ ERROR: 'Invalidate id:', id });
        }

        //\\Find one USER by id + relation schema COUNTRY && AREA + Validate return data.
        // const user = await Product.find({ _id: id }).populate('country').select('-createdAt -updatedAt -__v');
        const dataDB = await Product.findById(id)
            .select('-createdAt -updatedAt -__v -_id')
            .populate('product_detail_id', '-createdAt -updatedAt -__v')
            .populate('brand_id', '-createdAt -updatedAt -__v')
            .populate('category_id', '-createdAt -updatedAt -__v'); // console.log("\x1b[32m%s\x1b[0m", "USER:", dataDB)


        //\\check data - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', userId: id });
        }

        //\\Validate data response        data.films = data.films.map(({ _id, ...rest }) => rest); // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);
        //convert mongo document to a plain-old JavaScript object 
        // const data = dataDB.toObject()
        //delete attribute 
        // data.films = data.films.map(({ _id, ...rest }) => rest); // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);

        //\\RESPONSE
        return res.status(200).send({ message: 'Read successfully!', data: dataDB });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
}

// Read one USER by id && Include related COUNTRY && AREA
const getProductByCategory = async (req, res) => {
    try {

        //\\Get id from req.params
        const id = req.params.id;   // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require ProductId!' })
        }

        //\\Validate Mongo ObjectId
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send({ ERROR: 'Invalidate id:', id: id });
        }

        //\\Find one USER by id + relation schema COUNTRY && AREA + Validate return data.
        // const user = await Product.find({ _id: id }).populate('country').select('-createdAt -updatedAt -__v');
        const dataDB = await Product.find({ category_id: id})
            .select('-createdAt -updatedAt -__v ')
            .populate('product_detail_id', '-createdAt -updatedAt -__v')
            .populate('brand_id', '-createdAt -updatedAt -__v')
            .populate('category_id', '-createdAt -updatedAt -__v'); // console.log("\x1b[32m%s\x1b[0m", "USER:", dataDB)


        //\\check data - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', userId: id });
        }

        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object 
        // const data = dataDB.toObject()
        //delete attribute 
        // data.films = data.films.map(({ _id, ...rest }) => rest); // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);

        //\\RESPONSE
        return res.status(200).send({ message: 'Read successfully!', data: dataDB });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
}


const getProductByBrand = async (req, res) => {
    try {

        //\\Get id from req.params
        const id = req.params.id;    console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require ProductId!' })
        }

        //\\Validate Mongo ObjectId
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send({ ERROR: 'Invalidate id:', id });
        }

        //\\Find one USER by id + relation schema COUNTRY && AREA + Validate return data.
        // const user = await Product.find({ _id: id }).populate('country').select('-createdAt -updatedAt -__v');
        const dataDB = await Product.find({ brand_id: id})
            .select('-createdAt -updatedAt -__v ')
            .populate('product_detail_id', '-createdAt -updatedAt -__v')
            .populate('brand_id', '-createdAt -updatedAt -__v')
            .populate('category_id', '-createdAt -updatedAt -__v'); // console.log("\x1b[32m%s\x1b[0m", "USER:", dataDB)


        //\\check data - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', userId: id });
        }

        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object 
    
        //\\RESPONSE
        return res.status(200).send({ message: 'Read successfully!', data: dataDB });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
}

const getAllProduct = async (req, res) => {
     try {

        //\\Find one USER by id + relation schema COUNTRY && AREA + Validate return data.
        // const user = await Product.find({ _id: id }).populate('country').select('-createdAt -updatedAt -__v');
        const dataDB = await Product.find()
            .select('-createdAt -updatedAt -__v')
            .populate('product_detail_id', '-createdAt -updatedAt -__v')
            .populate('brand_id', '-createdAt -updatedAt -__v')
            .populate('category_id', '-createdAt -updatedAt -__v'); // console.log("\x1b[32m%s\x1b[0m", "USER:", dataDB)


        //\\check data - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', userId: id });
        }

        //\\RESPONSE
        return res.status(200).send({ message: 'Read successfully!', data: dataDB });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
}

// Update one USER by id.
const updateProductById = async (req, res) => {
    try {
        //\\Get id from req.params and data from req.body
        const id = req.params.id; // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);
        const body = req.body; // console.log("\x1b[32m%s\x1b[0m","USER_DATA: ", body);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require ProductId!' })
        }

        //\\Validate MongoDB ObjectId
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send({ message: 'Invalidate id:', id });
        }

        //\\Check req data
        if (!body) {
            // console.log({ERROR: 'Require user body!'})
            return res.status(400).send({ ERROR: 'Require user data!' })
        }


        //\\Find USER by id + update with new data
        // const updatedProduct = await Product.findByIdAndUpdate(id, data, { returnDocument: "after" });
        const dataDB = await Product.findOneAndUpdate(
            { _id: id },
            body,
            { returnDocument: "after" }
        ).select('-createdAt -updatedAt -__v -_id'); // console.log("\x1b[32m%s\x1b[0m","USER: ",dataDB)

        //\\CHECK USER - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', productId: id });
        }

        //\\RESPONSE
        return res.send({ message: 'Update successfully!', data: dataDB });
    } catch (error) {
        return res.send({ error: error.message });
    }
}


// Delete one USER by id.
const deleteProductById = async (req, res) => {
    try {

        //\\Get id from req.params
        const id = req.params.id;   // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require ProductId!' })
        }

        //\\Validate MongoDB ObjectId
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send({ message: 'Invalidate id:', id });
        }

        //\\Find and delete USER
        const dataDB = await Product.findByIdAndDelete(id)
            .select('-createdAt -updatedAt -__v -_id'); // console.log("\x1b[32m%s\x1b[0m","USER: ",dataDB)

        //\\CHECK USER - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', countryId: id });
        }

        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object to delete
        const data = dataDB.toObject()  // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);
        //delete attribute

        //\\RESPONSE
        return res.send({ message: 'Delete successfully!', data: data });
    } catch (error) {
        return res.send({ error: error.message });
    }
}







// Export all CRUD handlers so route files can attach them to Express endpoints.
const crudController = {

    addProduct,
    getProductById,
    getProductByCategory,
    getProductByBrand,
    getAllProduct,
    updateProductById,
    deleteProductById,
    
}

module.exports = crudController
