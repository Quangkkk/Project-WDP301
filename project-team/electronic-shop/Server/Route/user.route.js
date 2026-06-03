const express = require('express');
const router = express.Router();
const user = require('../Controller/user.controller')

router.post('/', user.addUser);

router.get('/id/:id', user.getUserById);

// router.get('/email', user.getUserByEmail);

// router.get('/phone', user.getUserByPhone);

router.get('/', user.getAllUser);

router.put('/:id', user.updateUserById);

router.delete('/id/:id', user.deleteUserById);

router.delete('/phone', user.deleteUserByPhone);

router.delete('/email', user.deleteUserByEmail);
module.exports = router;

