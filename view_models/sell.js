var fs = require("fs");

// get app root path
var appRoot = require('app-root-path');

var moment = require('moment');
moment.locale('pl');

module.exports = function(sellFromDb) {
  var sell = {};
  sell.id = sellFromDb.id;
  sell.title = sellFromDb.title;
  sell.description = sellFromDb.description;
  sell.location = sellFromDb.location;
  sell.price = sellFromDb.price === "free" ? "Za darmo" : sellFromDb.price + " zł";
  sell.tonegotiate = sellFromDb.tonegotiate;
  sell.date = getDate(sellFromDb.date);
  sell.time = getTime(sellFromDb.date);
  sell.mainImg = getMainImage(sellFromDb.id);
  sell.images = getImages(sellFromDb.id);

  sell.Category = sellFromDb.Category;
  sell.User = sellFromDb.User;

  return sell;
};

function getDate(datetime) {
  var creationDate = moment(datetime);

  if(creationDate.isSame(moment(), "day")) {
    return "dzisiaj";
  }
  else if(creationDate.isSame(moment(), "year")) {
    return creationDate.format("DD MMM");
  }
  else {
    return creationDate.format("DD MMM YYYYr.")
  }
}

function getTime(datetime) {
  return moment(datetime).format("HH:mm");
}

function getMainImage(id) {
  var dir = appRoot + '/public/uploads/ad/' + id + '/main/'
  var result = "";

  fs.readdirSync(dir).forEach(function(file) {
    if (file.indexOf(".jpg") > 0) {
      result = '/uploads/ad/' + id + '/main/' + file;
    }
  });
  return result;
}

function getImages(id) {
  var dir = appRoot + '/public/uploads/ad/' + id + '/'
  var results = [];

  fs.readdirSync(dir).forEach(function(file) {
    if (file.indexOf(".jpg") > 0) {
      results.push('/uploads/ad/' + id + '/' + file);
    }
  });
  return results;
}
