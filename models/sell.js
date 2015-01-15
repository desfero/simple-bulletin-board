"use strict";
module.exports = function(sequelize, DataTypes) {
  var Sell = sequelize.define("Sell", {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    location: DataTypes.STRING,
    price: DataTypes.STRING,
    tonegotiate: DataTypes.BOOLEAN,
    date: DataTypes.DATE
    }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        Sell.belongsTo(models.User);
        Sell.belongsTo(models.Category);
      }
    }
  });
  return Sell;
};
