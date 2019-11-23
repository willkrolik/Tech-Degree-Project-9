const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Course, User } = require('./models');
const bcrypt = require('bcryptjs');


function asyncHandler(cb){
    return async (req,res, next) => {
        try {
            await cb(req, res, next);
        } catch(err) {
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
const authenticateUser = (req, res, next) => {
  let message = null;

  // Get the user's credentials from the Authorization header.
  const credentials = { name: 'admin@project9.org', pass: 'password' };//auth(req);

  if (credentials) {
    // Look for a user whose `username` matches the credentials `name` property.
    User.findOne({
      where: {
        emailAddress: credentials.name
      }
    }).then((user) => {
      // FIXME probably shouldn't log this at all
      console.log('successfully loaded user', JSON.stringify(user));

      const authenticated = bcrypt.compareSync(credentials.pass, user.password);
      if (authenticated) {
        console.log(`Authentication successful for username: ${user.emailAddress}`);
        // Store the user on the Request object.
        req.currentUser = user;
      } else {
        message = `Authentication failure for username: ${user.emailAddress}`;
      }
    }, () => {
      console.warn('could not find user in database for auth', credentials.name);
      message = `User not found for username: ${credentials.name}`;
    }).finally(() => {
      if (message) {
        console.warn(message);
        res.status(401).json({ message: 'Access Denied' });
      } else {
        next();
      }
    });
  }
  
};

// Construct a router instance.


// Return a list of all courses method
router.get('/courses', asyncHandler(async(req, res, next) => {
    Course.findAll({
        order: [["id", "ASC"]],
        attributes: ['id','userId', 'title', 'description', 'estimatedTime', 'materialsNeeded', ]
    })
    .then(courses => {
        res.json({ courses });
    })
  }))

// get route for specific ID of course
  router.get('/courses/:id', asyncHandler(async(req, res, next) => {
    Course.findOne({
      attributes: ['id', 'userId', 'title', 'description', 'estimatedTime', 'materialsNeeded'],
      where: {
        id: req.params.id
      }
    }).then(course => {
      if(course) {
        res.json({ course })
      } else {
        res.status(404).json({ message: 'Route not found' });
      }
    })
  }))

// router post
router.post('/courses', [
    check('title').exists().withMessage('Please provide a value for title'),
    check('description').exists().withMessage('Please provide a value for description')
  ], authenticateUser, asyncHandler(async(req, res, next)=> {
    const user = req.currentUser.id;

    console.log('course request', req.body);
    // validation result
    const errors = validationResult(req);

     // validation errors
     if (!errors.isEmpty()) {

         // list of error messages
         const errorMessages = errors.array().map(error => error.msg);

          // validation client side
         res.status(400).json({ errors: errorMessages });
     } else {

        // new course
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

  router.put('/courses/:id', [
    check('title').exists().withMessage('Please provide a value for title'),
    check('description').exists().withMessage('Please provide a value for description')
  ], authenticateUser, asyncHandler(async(req, res, next) => {
    const user = req.currentUser.id;


    const errors = validationResult(req);

     // errors
     if (!errors.isEmpty()) {

         // map() goes through the list in the array a prints out message
         const errorMessages = errors.array().map(error => error.msg);

         // validation returned / error 404
         res.status(400).json({ errors: errorMessages });
        } else {
            await Course.findOne({
              where: [{ id: req.params.id }]
            })
            .then((course) => {

                // if you select  a user to update
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

  // router delete
  router.delete('/courses/:id', authenticateUser, asyncHandler(async (req, res, next)=> {
    const user = req.currentUser.id;

    await Course.findOne({
      where: [{ id: req.params.id }]
    })
    .then((course) => {
         // If user has the selected course delete it
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

// Route that returns the current authenticated user.
router.get('/users', authenticateUser, (req, res) => {
  const user = req.currentUser;

  res.json({
    name: user.name,
    username: user.username,
  });
});

// Route that creates a new user.
router.post('/users', [
  check('name')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "name"'),
  check('username')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "username"'),
  check('password')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "password"'),
], (req, res) => {
  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  // If there are validation errors...
  if (!errors.isEmpty()) {
    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    return res.status(400).json({ errors: errorMessages });
  }

  // Get the user from the request body.
  const user = req.body;

  // Hash the new user's password.
  user.password = bcrypt.hashSync(user.password);

  // Saved in the database
  Users.create(user).then((user, created) => {
    // Set the status to 201 Created and end the response.
    return res.status(201).end();
  }).catch(err => {
    return res.status(422).end();
  });

  
});

module.exports = router;
