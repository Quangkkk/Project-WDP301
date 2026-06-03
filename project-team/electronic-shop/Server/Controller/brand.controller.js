const { default: mongoose } = require('mongoose');
const db = require('../Model/index.js');
const Brand = db.brand

const addBrand = async (req, res) => {
    try {

        //\\data from req.body
        const body = req.body; // console.log("\x1b[32m%s\x1b[0m","AREA_DATA: ", body);

        //\\validate req data
        if (!body) {
            // console.log({ERROR: 'Require area data!'})
            return res.status(400).send({ ERROR: 'Require area data!' })
        }

        //\\Initialize new AREA + Save AREA to database
        const dataDB = await new Brand(body).save(); // console.log("\x1b[32m%s\x1b[0m","AREA: ", dataDB);

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

const getAllBrand = async (req, res) => {
    try {


        //\\Find one AREA by id + validate return data.
        const dataDB = await Brand.find()
            .select('-createdAt -updatedAt -__v -_id'); // console.log("\x1b[32m%s\x1b[0m","AREA:",dataDB)

        //\\Check AREA - this only work with findById
        if (!dataDB) {
            // console.log("area not found or wrong id")
            return res.status(200).send({ message: 'No information', areaId: id });
        }



        //\\RESPONSE
        return res.send({ message: 'Read successfully!', data: dataDB });
    } catch (error) {
        return res.send({ error: error.message });
    }
}

const updateBrandById = async (req, res) => {
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
        // const updatedBrand = await Brand.findByIdAndUpdate(id, data, { new: true });
        const dataDB = await Brand.findOneAndUpdate(
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

const deleteBrandById = async (req, res) => {
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
        const dataDB = await Brand.findByIdAndDelete(id)
            .select('-createdAt -updatedAt -__v -_id') // console.log("\x1b[32m%s\x1b[0m","AREA: ",dataDB)

        //\\Check AREA - this only work with findById
        if (!dataDB) {
            return res.status(200).send({ message: 'No area information', areaId: id });
        }


        //\\Validate data response
        //convert mongo document to a plain-old JavaScript object to delete
        const data = dataDB.toObject();  // console.log("\x1b[32m%s\x1b[0m","RESPONSE_DATA: ", data);



        //\\RESPONSE
        return res.status(200).send({ message: 'Delete successfully!', data: data });

    } catch (error) {
        return res.send({ error: error.message });
    }
}



// Export all CRUD handlers so route files can attach them to Express endpoints.
const crudController = {

    addBrand,
    getAllBrand,
    updateBrandById,
    deleteBrandById,

}

module.exports = crudController