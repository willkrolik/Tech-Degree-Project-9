'use strict';
const bcrypt = require('bcryptjs');
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    emailAddress: DataTypes.STRING,
    password: DataTypes.STRING
  }, {});
  User.associate = (models) => {
    User.hasMany(models.Course, {
      as: 'user',
      foreignKey: {
        fieldName: 'userId',
        allowNull: false,
      },
    });
  };
  User.destroy({
    where: {
      emailAddress: 'admin@project9.org'
    }
  }).then(() => {
    User.findOrCreate({ 
      where: { 
        emailAddress: 'admin@project9.org'
      },
      defaults: {
        password: bcrypt.hashSync('password', 10),
        firstName: 'admin',
        lastName: 'mcadminface'
      }
    })
    .then(([user, created]) => {
      if (created) {
        console.log('admin account created', JSON.stringify(user));
      } else {
        console.log('admin account already exists', JSON.stringify(user));
      }
    });
  });
  

  return User
};