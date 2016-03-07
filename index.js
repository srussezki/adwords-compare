// configs
var fs = require('fs'),
    args = process.argv.slice(2),
    fileOne = args[0],
    fileTwo = args[1];

if(!fileOne || !fileTwo) {
  console.error("ERROR: Please provide the files which should be compared as the first and second argument");
}
try {
  fs.statSync(fileOne, function() {});
} catch (e) {
  console.error("ERROR: file " + fileOne + " could not be found"); return;
}
try {
  fs.statSync(fileTwo, function() {});
} catch (e) {
  console.error("ERROR: file " + fileTwo + " could not be found"); return;
}

// csv file configuration
var csvSettings = {delimiter: "\t", quote: '"'};

// configuration for entities
// the identifiers property is responsible for building a unique identifying key, which is the key for comaprison
// the attributes property represents the variable or describing part of entities
var identifiers = {
  campaign: {
    identifiers: ['Campaign'],
    attributes: ['Campaign Daily Budget', 'Location', 'Language', 'ID', 'Campaign Status']
  },
  adgroup: {
    identifiers: ['Campaign', 'Ad group'],
    attributes: ['Ad group Status', 'Max cpc']
  },
  ad: {
    identifiers: ['Campaign', 'Ad group', 'Headline', 'Description Line 1', 'Description Line 2', 'Display Url'],
    attributes: ['Device Preference', 'Final URL']
  },
  keyword: {
    identifiers: ['Campaign', 'Ad group', 'Keyword', 'Criterion Type'],
    attributes: ['Status', 'Tracking template', 'Custom parameter']
  }
}


// imports
var Converter = require("csvtojson").Converter,
    $ = require('jquery-deferred'),
    printf = require('printf'),
    _ = require('lodash');

var CHANGE = {
  NEW: '+++',
  DELETED: '---',
  ATTR_NEW: '! +',
  ATTR_DELETED: '! -',
  ATTR_CONFLICT: '!<>'
};

var checkedCounters = {},
    unparsedRows = 0;

function readFile(fileName) {
  var def = $.Deferred();

  require("fs")
    .createReadStream(fileName)
    .pipe(
      new Converter(csvSettings)
        .on("end_parsed", function (data) {
            console.log(data.length + ' entities read from file ' + fileName);
            def.resolve(data);
        })
    );

  return def;
}

function isPresent(data, identifiers) {
  for (var i = 0; i < identifiers.length; i++) {
    if(!data.hasOwnProperty(identifiers[i])) {
      return false;
    }
  }
  return true;
}

function getIdKey(entityType, data) {
  var idfs = identifiers[entityType].identifiers,
      key = [];

  for (var i = 0; i < idfs.length; i++) {
    if(!data[idfs[i]]) return;

    key[i] = data[ idfs[i] ];
  }

  return key.join(' > ');
}

function parseEntity (entityType, data, extendObj) {
  var idfs = identifiers[entityType];

    if(isPresent(data, idfs.identifiers)) {
      var entityData = {};

      (idfs.attributes || []).forEach( attr => {
          if(data[attr]) {
              entityData[attr] = data[attr];
          }
      });

      return typeof extendObj === 'object' ? Object.assign(extendObj, entityData) : entityData;
    }
}

function parse(data) {
  console.log('start parsing');

  var identifierNames = Object.keys(identifiers),
      identifierName,
      record,
      result = {},
      entityData,
      entityKey,
      isParsed;

  // init
  identifierNames.forEach(identifierName => {result[identifierName] = {}});

  for (var i = 0; i < data.length; i++) {
    record = data[i];
    isParsed = false;

    for (var j = 0; j < identifierNames.length; j++) {
      identifierName = identifierNames[j];
      entityKey = getIdKey(identifierName, record);

      if( entityKey && (entityData = parseEntity(identifierName, record, result[identifierName][entityKey] )) ) {
        // console.log('<<<', identifierName, entityKey, JSON.stringify(entityData, null, '\t'))
        result[identifierName][entityKey] = entityData;
        isParsed = true;
      }
    }

    if(!isParsed) {
      unparsedRows++;
    }
  }

  console.log('finished parsing');
  return result;
}

function compare(one, two) {
  var types = Object.keys(one);
  // console.log('comparing', JSON.stringify(one, null, "\t"), JSON.stringify(two, null, "\t"));

  types.forEach(type => {
      compareByType(one[type], two[type], type);
  });
}

function compareByType(one, two, type) {
   // console.log('comparing by TYPE '+type, JSON.stringify(one, null, "\t"), JSON.stringify(two, null, "\t"));

   checkedCounters[type] = 0; // init counter

   _.uniq(Object.keys(one).concat(Object.keys(two))).forEach( identifier => {
      checkedCounters[type]++;

      // console.log('>>>',type, identifier, JSON.stringify([one[identifier], two[identifier]], null, '\t'))

      if(one.hasOwnProperty(identifier) ? !two.hasOwnProperty(identifier) : two.hasOwnProperty(identifier)) {
        var operator = one.hasOwnProperty(identifier) ? CHANGE.DELETED : CHANGE.NEW;
        printDiff(operator, type, identifier);
      } else {
        compareByAttributes(one[identifier], two[identifier], type, identifier);
      }
   });
}

function compareByAttributes(one, two, type, identifier) {
  // console.log('comparing by Attributes '+type+' '+identifier, JSON.stringify(one, null, "\t"), JSON.stringify(two, null, "\t"));

    _.uniq(Object.keys(one).concat(Object.keys(two))).forEach( attr => {
      if(one.hasOwnProperty(attr) ? !two.hasOwnProperty(attr) : two.hasOwnProperty(attr)) {
        var operator = one.hasOwnProperty(attr) ? CHANGE.ATTR_DELETED : CHANGE.ATTR_NEW;
        printDiff(operator, printf('%s [%s]', type, attr), identifier);
      }
      else if (one[attr] !== two[attr]) {
        printDiff(
          CHANGE.ATTR_CONFLICT,
          printf('%s [%s]', type, attr),
          identifier,
          printf('"%s" <> "%s"', one[attr], two[attr])
        );
      }
   });
}


function printDiff(diffSymbol, location, name, text) {
  console.log(printf('\t%s  %-40s: "%s":\t%s', diffSymbol, location, name, text || ''));
}





var startTime = Date.now();

$.when(readFile(fileOne), readFile(fileTwo))
  .then((dataOne, dataTwo)=>{
    compare( parse(dataOne), parse(dataTwo) )
  })
  .fail(err => console.log("ERROR", err))
  .always(()=>{
    console.log("script runtime: " + (Date.now() - startTime) + 'ms');
    console.log("checked: ", JSON.stringify(checkedCounters, null, "\t"));
    if(unparsedRows > 0) {
      var txt = 'WARNING!!! ' + unparsedRows + ' ROWS COULD NOT BE PARSED';
      console.log('\t' + '-'.repeat(txt.length));
      console.log('\t' + txt);
      console.log('\t' + '-'.repeat(txt.length));
    }
  });



