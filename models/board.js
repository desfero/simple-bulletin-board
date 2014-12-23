"use strict";
module.exports = function(sequelize, DataTypes) {
  var Board = sequelize.define("Board", {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    localization: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        Board.belongsTo(models.User);
        Board.belongsTo(models.Category);
      }
    }
  });
  return Board;
};
