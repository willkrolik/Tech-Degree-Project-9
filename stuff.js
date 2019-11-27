const auth = require('basic-auth');
const bcryptjs = require('bcryptjs');
const { User } = require('../models');

// authenticate users
const authenticateUser = async(req, res, next) => {
    let message = null;

      const credentials = auth(req);

      if (credentials) {
      //  email
        await User.findOne({ where: { emailAddress : credentials.name }}).then( user => {

      // retrieved
      if (user) {
        const authenticated = bcryptjs
          .compareSync(credentials.pass, user.password);

      // passwords match
      if (authenticated) {
      req.currentUser = user;
      } else {
        message = `Authentication failure for username: ${user.firstName} ${user.lastName}`;
      }
    } 
    
    
    
    else {
      message = `User not found for username: ${crendentials.name}`;
    }
  })

  } else {
    message = 'Auth header not found';
  }
      // authentication fail
      if (message) {
        console.warn(message);

      // 401 
        res.status(401).json({ message: 'Access Denied' });
    } else {
      next();
    }
  };

  module.exports =  authenticateUser;