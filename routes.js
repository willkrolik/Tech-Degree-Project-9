'use strict';
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Course, User } = require('./models');
const bcrypt = require('bcryptjs');
const auth = require('basic-auth');

// This array is used to keep track of user records
// as they are created.
const users = [];

const nameValidator = check('name')
  .exists({ checkNull: true, checkFalsy: true })
  .withMessage('Please provide a value for "name"');

function asyncHandler(cb) {
  return async (req, res, next) => {
    try {
      await cb(req, res, next);
    } catch (err) {
      next(err);
    }
  }
}

/**
 * Middleware to authenticate the request using Basic Authentication.
 * @param {Request} req - The Express Request object.
 * @param {Response} res - The Express Response object.
 * @param {Function} next - The function to call to pass execution to the next middleware.
 */
const authenticateUser = async(req, res, next) => {
  let message = null;

  // Parse the user's credentials from the Authorization header.
  const credentials = auth(req);

  if (credentials) {
    // Look for a user whose `username` matches the credentials `name` property.
    //const user = users.find(u => u.username === credentials.name);
     await User.findOne({where: { emailAddress : credentials.name } }).then( user => {

    if (user) {
      const authenticated = bcrypt
        .compareSync(credentials.pass, user.password);
      if (authenticated) {
        console.log(`Authentication successful for username: ${user.username}`);

        // Store the user on the Request object.
        req.currentUser = user;
      } else {
        message = `username: ${user.username} not found`;
      }
    } 
    
    
    else {
      message = `User not found for username: ${credentials.name}`;
    } 
  })
  } else {
    message = 'Auth header not found';
  }

  if (message) {
    console.warn(message);
    res.status(401).json({ message: 'Access Denied' });
  } else {
    next();
  }
};

// Return a list of all courses
router.get('/courses', asyncHandler(async (req, res, next) => {
  Course.findAll({
    order: [["id", "ASC"]],
    attributes: ['id', 'userId', 'title', 'description', 'estimatedTime', 'materialsNeeded',]
  })
    .then(courses => {
      res.json({ courses });
    })
}))

// get individual course
router.get('/courses/:id', asyncHandler(async (req, res, next) => {
  Course.findOne({
    attributes: ['id', 'userId', 'title', 'description', 'estimatedTime', 'materialsNeeded'],
    where: {
      id: req.params.id
    }
  }).then(course => {
    if (course) {
      res.json({ course })
    } else {
      res.status(404).json({ message: 'Route not found' });
    }
  })
}))

// creates course and description, original route code credit to ISimpson
router.post('/courses', [
  check('title').exists().withMessage('Value required for title'),
  check('description').exists().withMessage('Value required for description')
], authenticateUser, asyncHandler(async (req, res, next) => {
  const user = req.currentUser.id;

  console.log('course request', req.body);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    res.status(400).json({ errors: errorMessages });
  } else {

    
    await Course.create({ ...req.body, userId: user })
      .then((course) => {
        if (course) {
          res.status(201).location(`/api/courses/${course.id}`).end();
        } else {
          next();
        }
      })
  }
}))
//modify existing course, original code credit to ISimpson
router.put('/courses/:id', [
  check('title').exists().withMessage('Value required for for title'),
  check('description').exists().withMessage('Value required for description')
], authenticateUser, asyncHandler(async (req, res, next) => {
  const user = req.currentUser.id;


  const errors = validationResult(req);

  if (!errors.isEmpty()) {

    const errorMessages = errors.array().map(error => error.msg);


    res.status(400).json({ errors: errorMessages });
  } else {
    await Course.findOne({
      where: [{ id: req.params.id }]
    })
      .then((course) => {
        if (course.userId === user) {
          if (course) {
            course.update(req.body);
            res.status(204).end();
          } else {
            next();
          }
        } else {
          res.status(403).json({ message: "Current User doesn't own the requested course" }).end();
        }
      })
  }
}))

// deletes specifc course, original code credit to ISimpson
router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res, next) => {
  const user = req.currentUser.id;

  await Course.findOne({
    where: [{ id: req.params.id }]
  })
    .then((course) => {
      if (course.userId === user) {
        if (course) {
          course.destroy();
          res.status(204).end();
        } else {
          next();
        }
      } else {
        res.status(403).json({ message: "Current User doesn't own the requested course" }).end();
      }
    })
}))

// returns current user 
router.get('/users', authenticateUser, (req, res) => {
  const user = req.currentUser;

  res.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddress: user.emailAddress,
  });
});

// Route that creates a new user.
router.post('/users', [
  check('firstName')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Value required for "first name"'),
  check('lastName')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Value required for "last name"'),
  check('password')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Value required for "password"'),
  check('emailAddress')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Value required for "emailAddress"'),

], (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);

    
    return res.status(400).json({ errors: errorMessages });
  }

 
  const user = req.body;

  // Add the user to the `users` array.
  
  
  user.password = bcrypt.hashSync(user.password);

  users.push(user);
    
  return res.status(201).end();
  

});

module.exports = router;
