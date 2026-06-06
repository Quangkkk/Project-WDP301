//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\ CRUD - ADVANCE //\\//\\

const { default: mongoose } = require('mongoose');
const db = require('../Model/index.js');
const User = db.user;



// Create a USER
const addUser = async (req, res) => {
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

        //\\RESPONSE
        return res.status(201).send({ message: 'Create successfully!', data: data });
    } catch (error) {
        return res.status(500).send({ ERROR: error.message });
    }
}





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
        // .populate({
        //     path: 'country',
        //     select: '-createdAt -updatedAt -__v -_id',
        // }); // console.log("\x1b[32m%s\x1b[0m", "USER:", dataDB)


        //\\check data - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No information', userId: id });
        }

        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object 
        const data = dataDB.toObject()
        //delete attribute 

        //\\RESPONSE
        return res.status(200).send({ message: 'Read successfully!', data: data });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
}

const getUserByPhone = async (req, res) => {
    try {

        //\\Get id from req.params
        const body = req.body; // console.log("\x1b[32m%s\x1b[0m","USER_DATA: ", body);

        //\\Check req data
        if (!body) {
            // console.log({ERROR: 'Require user body!'})
            return res.status(400).send({ ERROR: 'Require user data!' })
        }

        //\\Find one USER by id + relation schema COUNTRY && AREA + Validate return data.
        // const user = await User.find({ _id: id }).populate('country').select('-createdAt -updatedAt -__v');
        const dataDB = await User.find({phone: body.phone})
            .select('-createdAt -updatedAt -__v -_id')
        // .populate({
        //     path: 'country',
        //     select: '-createdAt -updatedAt -__v -_id',
        // }); // console.log("\x1b[32m%s\x1b[0m", "USER:", dataDB)


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


const getUserByEmail = async (req, res) => {
    try {

        //\\Get id from req.params
        const body = req.body;  console.log("\x1b[32m%s\x1b[0m","USER_DATA: ", body);

        //\\Check req data
        if (!body) {
            // console.log({ERROR: 'Require user body!'})
            return res.status(400).send({ ERROR: 'Require user data!' })
        }


        //\\Find one USER by id + relation schema COUNTRY && AREA + Validate return data.
        // const user = await User.find({ _id: id }).populate('country').select('-createdAt -updatedAt -__v');
        const dataDB = await User.find({ email: body.email })
            .select('-createdAt -updatedAt -__v -_id')
        // .populate({
        //     path: 'country',
        //     select: '-createdAt -updatedAt -__v -_id',
        // }); // console.log("\x1b[32m%s\x1b[0m", "USER:", dataDB)


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


const getAllUser = async (req, res) => {
    try {

        //\\Find one USER by id + relation schema COUNTRY && AREA + Validate return data.
        // const user = await User.find({ _id: id }).populate('country').select('-createdAt -updatedAt -__v');
        const dataDB = await User.find()
            .select('-createdAt -updatedAt -__v -_id')
        // console.log("\x1b[32m%s\x1b[0m", "USER:", dataDB)


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

        //\\RESPONSE
        return res.send({ message: 'Update successfully!', data: data });
    } catch (error) {
        return res.send({ error: error.message });
    }
}



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

// Delete one USER by email.
const deleteUserByEmail = async (req, res) => {
    try {

     //\\Get id from req.params
        const body = req.body; // console.log("\x1b[32m%s\x1b[0m","USER_DATA: ", body);

        //\\Check req data
        if (!body) {
            // console.log({ERROR: 'Require user body!'})
            return res.status(400).send({ ERROR: 'Require user data!' })
        }

        //\\Find and delete USER
        const dataDB = await User.findOneAndDelete({email: body.email})
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

// Delete one USER by phone.
const deleteUserByPhone = async (req, res) => {
    try {


     //\\Get id from req.params
        const body = req.body; // console.log("\x1b[32m%s\x1b[0m","USER_DATA: ", body);

        //\\Check req data
        if (!body) {
            // console.log({ERROR: 'Require user body!'})
            return res.status(400).send({ ERROR: 'Require user data!' })
        }

        //\\Find and delete USER
        const dataDB = await User.findOneAndDelete({phone: body.phone})
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

    addUser,
    getUserById,
    // getUserByPhone,
    // getUserByEmail,
    getAllUser,
    updateUserById,
    deleteUserById,
    deleteUserByEmail,
    deleteUserByPhone,

}

module.exports = crudController