//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\

const { default: mongoose } = require('mongoose');
const db = require('../models/index.js');
const Country = db.country;
const User = db.user;
const Area = db.area



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//\\SCRIPT//\\//\\SCRIPT//\\//\\SCRIPT//\\//\\SCRIPT//\\//\\SCRIPT//\\//\\SCRIPT//\\//\\SCRIPT//\\//\\SCRIPT//\\//\\SCRIPT//\\
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * CRUD - ADVANCE
 */

/*
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////CREATE////CREATE////CREATE////CREATE////CREATE////CREATE////CREATE////CREATE////CREATE////CREATE////CREATE////CREATE////CREATE////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
*/



// Create a USER
const createUser = async (req, res) => {
    try {

        //\\Get data from req.body
        const body = req.body; // console.log("\x1b[32m%s\x1b[0m","USER_DATA: ", body);

        //\\Check req data
        if (!body) {
            // console.log({ERROR: 'Require user body!'})
            return res.status(400).send({ ERROR: 'Require user data!' })
        }

        //\\Initialize new USER + Save USER to database
        const dataDB = await new User(body).save(); // console.log("\x1b[32m%s\x1b[0m","USER: ", dataDB);

        //\\Validate data
        //convert mongo document to a plain-old JavaScript object 
        const data = dataDB.toObject()
        //delete attribute
        delete data._id;
        delete data.createdAt;
        delete data.updatedAt;
        delete data.__v
        data.films = data.films.map(({ _id, ...rest }) => rest); // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);

        //\\RESPONSE
        return res.status(201).send({ message: 'Create successfully!', data: data });
    } catch (error) {
        return res.status(500).send({ ERROR: error.message, data });
    }
}


// Create an AREA 
const createArea = async (req, res) => {
    try {

        //\\Get data from req.body
        const body = req.body; // console.log("\x1b[32m%s\x1b[0m","AREA_DATA: ", body);

        //\\Check req data
        if (!body) {
            // console.log({ERROR: 'Require area data!'})
            return res.status(400).send({ ERROR: 'Require area data!' })
        }

        //\\Initialize new AREA + Save AREA to database
        const dataDB = await new Area(body).save(); // console.log("\x1b[32m%s\x1b[0m","AREA: ", dataDB);

        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object 
        const data = dataDB.toObject()
        //delete attribute
        delete data._id;
        delete data.createdAt;
        delete data.updatedAt;
        delete data.__v; // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);

        //\\RESPONSE
        return res.status(201).send({ message: 'Create successfully!', data: data });
    } catch (error) {
        return res.status(500).send({ ERROR: error.message });
    }
}



/*
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////READ////READ////READ////READ////READ////READ////READ////READ////READ////READ////READ////READ////READ////READ////READ////READ////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
*/



// Read one USER by id && Include related COUNTRY && AREA
const getUserById = async (req, res) => {
    try {

        //\\Get id from req.params
        const id = req.params.id;   // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require UserId!' })
        }

        //\\Validate Mongo ObjectId
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send({ ERROR: 'Invalidate id:', id });
        }

        //\\Find one USER by id + relation schema COUNTRY && AREA + Validate return data.
        // const user = await User.find({ _id: id }).populate('country').select('-createdAt -updatedAt -__v');
        const dataDB = await User.findById(id)
            .select('-createdAt -updatedAt -__v -_id')
            .populate({
                path: 'country',
                select: '-createdAt -updatedAt -__v -_id',
                populate: {
                    path: 'area',
                    select: '-createdAt -updatedAt -__v -_id'
                }
            }); // console.log("\x1b[32m%s\x1b[0m", "USER:", dataDB)


        //\\check data - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', userId: id });
        }

        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object 
        const data = dataDB.toObject()
        //delete attribute 
        data.films = data.films.map(({ _id, ...rest }) => rest); // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);

        //\\RESPONSE
        return res.status(200).send({ message: 'Read successfully!', data: data });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
}




// Read one area by id.
const getAreaById = async (req, res) => {
    try {

        //\\Get id from req.params
        const id = req.params.id;   // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id params!")
            return res.status(400).send({ ERROR: 'Require AreaId!' })
        }

        //\\Validate MongoDB ObjectId
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send({ message: 'Invalidate id:', id });
        }

        //\\Find one AREA by id + validate return data.
        const dataDB = await Area.findById({ _id: id })
            .select('-createdAt -updatedAt -__v -_id'); // console.log("\x1b[32m%s\x1b[0m","AREA:",dataDB)

        //\\Check AREA - this only work with findById
        if (!dataDB) {
            // console.log("area not found or wrong id")
            return res.status(200).send({ message: 'No information', areaId: id });
        }

        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object to delete
        const data = dataDB.toObject()  // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);
        //delete attribute

        //\\RESPONSE
        return res.send({ message: 'Read successfully!', data: data });
    } catch (error) {
        return res.send({ error: error.message });
    }
}



/*
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////UPDATE////UPDATE////UPDATE////UPDATE////UPDATE////UPDATE////UPDATE////UPDATE////UPDATE////UPDATE////UPDATE////UPDATE////UPDATE////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
*/



// Update one USER by id.
const updateUserById = async (req, res) => {
    try {
        //\\Get id from req.params and data from req.body
        const id = req.params.id; // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);
        const body = req.body; // console.log("\x1b[32m%s\x1b[0m","USER_DATA: ", body);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require UserId!' })
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
        // const updatedUser = await User.findByIdAndUpdate(id, data, { returnDocument: "after" });
        const dataDB = await User.findOneAndUpdate(
            { _id: id },
            body,
            { returnDocument: "after" }
        ).select('-createdAt -updatedAt -__v -_id'); // console.log("\x1b[32m%s\x1b[0m","USER: ",dataDB)

        //\\CHECK USER - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', countryId: id });
        }

        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object to delete
        const data = dataDB.toObject()  // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);
        //delete attribute
        data.films = data.films.map(({ _id, ...rest }) => rest); // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);

        //\\RESPONSE
        return res.send({ message: 'Update successfully!', data: data });
    } catch (error) {
        return res.send({ error: error.message });
    }
}


// Update one AREA by id.
const updateAreaById = async (req, res) => {
    try {

        //\\Get id from req.params and data from req.body
        const id = req.params.id; // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);
        const body = req.body; // console.log("\x1b[32m%s\x1b[0m","USER_DATA: ", body);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require UserId!' })
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

        //\\Find AREA by id and update with new data
        // const updatedArea = await Area.findByIdAndUpdate(id, data, { new: true });
        const dataDB = await Area.findOneAndUpdate(
            { _id: id },
            body,
            { returnDocument: "after" }
        ).select('-createdAt -updatedAt -__v -_id');  // console.log("\x1b[32m%s\x1b[0m","AREA: ",dataDB)


        //\\CHECK AREA - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', countryId: id });
        }

        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object to delete
        const data = dataDB.toObject()  // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);
        //delete attribute

        //\\RESPONSE
        return res.send({ message: 'Update successfully!', data: data });
    } catch (error) {
        return res.send({ error: error.message });
    }
}



/*
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////DELETE////DELETE////DELETE////DELETE////DELETE////DELETE////DELETE////DELETE////DELETE////DELETE////DELETE////DELETE////DELETE////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
*/


// Delete one USER by id.
const deleteUserById = async (req, res) => {
    try {

        //\\Get id from req.params
        const id = req.params.id;   // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);

        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require UserId!' })
        }

        //\\Validate MongoDB ObjectId
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send({ message: 'Invalidate id:', id });
        }

        //\\Find and delete USER
        const dataDB = await User.findByIdAndDelete(id)
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



// Delete one AREA by id.
const deleteAreaById = async (req, res) => {
    try {

        //\\Get id from req.params
        const id = req.params.id;   // console.log("\x1b[32m%s\x1b[0m","USER_ID: ", id);


        //\\Check req params
        if (!id) {
            // console.log("ERROR: 'Require id param!")
            return res.status(400).send({ ERROR: 'Require UserId!' })
        }

        //\\Validate MongoDB ObjectId  
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).send({ message: 'Invalidate id:', id });
        }

        //\\Find and delete AREA
        const dataDB = await Area.findByIdAndDelete(id)
            .select('-createdAt -updatedAt -__v -_id') // console.log("\x1b[32m%s\x1b[0m","AREA: ",dataDB)

        //\\Check AREA - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No area information', areaId: id });
        }


        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object to delete
        const data = dataDB.toObject();  // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);
        //delete attribute



        //\\RESPONSE
        return res.status(200).send({ message: 'Delete successfully!', data: data });

    } catch (error) {
        return res.send({ error: error.message });
    }
}

const billData = {
    amount_price: req.body.rentalPrice,  // Đổi từ retal_price sang amount_price
    counter_account_name: req.body.counterAccountName,
    counter_account_number: req.body.counterAccountNumber,
    order_code_pay_os: req.body.orderCodePayOs,
    status: req.body.status || 'pending', // Default to pending if not provided
    status: req.body.status || 'pending',
    transaction_bank_time: req.body.transactionDateTime, // Đổi từ transaction_date_time sang transaction_bank_time
    reference_bank: req.body.referenceBank,
    user_id: req.body.userId,
  };



// Export all CRUD handlers so route files can attach them to Express endpoints.
const crudController = {
    createUser,
    createArea,

    getUserById,
    getAreaById,

    updateUserById,
    updateAreaById,

    deleteUserById,
    deleteAreaById,
}

module.exports = crudController
