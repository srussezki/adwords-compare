var Converter = require("csvtojson").Converter,
    $ = require('jquery-deferred'),
    printf = require('printf'),
    _ = require('lodash'),
    config = require('./config.js'),
    fs = require('fs');

// some validation
var args = process.argv.slice(2),
    fileOne = args[args.length-2],
    fileTwo = args[args.length-1],
    outputFile;


for (var i = 0; i < args.length; i+=2) {
  switch(args[i]) {
    case '-d':
      args[i+1] = args[i+1] === '\\t' ? '\t' : args[i+1]; // use tab
      config.defaultCsvSettings.delimiter = args[i+1];
      break;
    case '-q':
      config.defaultCsvSettings.quote = args[i+1];
      break;
    case '-o':
      outputFile = args[i+1];
      fs.writeFile(outputFile, 'DIFF\tLOCATION\tKEY\tDIFF\n');
      break;
  }
}

if(!fileOne || !fileTwo) {
  console.error("ERROR: Please provide the files which should be compared as the first and second argument");
}
try {  fs.statSync(fileOne, function() {})  } catch (e) {
  console.error("ERROR: file " + fileOne + " could not be found"); return;
}
try {  fs.statSync(fileTwo, function() {})  } catch (e) {
  console.error("ERROR: file " + fileTwo + " could not be found"); return;
}

var checkedCounters = {},
    unparsedRows = 0;

/**
 * reads a whole CSV file
 * @return {object} $.Deferred()
 */
function readFile(fileName) {
  var def = $.Deferred();

  require("fs")
    .createReadStream(fileName)
    .pipe(
      new Converter(config.defaultCsvSettings)
        .on("end_parsed", function (data) {
            console.log(data.length + ' entities read from file ' + fileName);
            def.resolve(data);
        })
    );

  return def;
}

/**
 * verifies, if an entity (defined by @identifiers in config object) is present in data row
 * @param  {object}  data        key value pairs of an (undefined) object
 * @param  {array}   identifiers array of keys which has to be present
 * @return {Boolean}             returns true if ALL identifiers were present
 */
function isPresent(data, identifiers) {
  for (var i = 0; i < identifiers.length; i++) {
    if(!data.hasOwnProperty(identifiers[i])) {
      return false;
    }
  }
  return true;
}

/**
 * returns a unique key for an entity
 * @param  {string}   entityType  type of the desired entity
 * @param  {object}   data        key value pairs of an (undefined) object
 * @param  {object}   cfg         configuration object
 * @return {string|undefined}     returns a key - if present - for the desired entity type
 */
function getIdKey(entityType, data, cfg) {
  var entityIdentifiers = cfg[entityType].identifiers,
      key = [];

  for (var i = 0; i < entityIdentifiers.length; i++) {
    if(!data[entityIdentifiers[i]]) return;

    key[i] = data[ entityIdentifiers[i] ];
  }

  return key.join(' > ');
}

/**
 * parses a (desired) entity - if possible - from a data object
 * @param  {string} entityType the dsired enity type
 * @param  {object} data       key value pairs of an (undefined) object
 * @param  {object} extendObj  (optional) object, which will be extended
 * @return {object|undefined}  parsed entity object
 */
function parseEntity (entityType, data, extendObj, cfg) {
  var entityConfig = cfg[entityType];

    if(isPresent(data, entityConfig.identifiers)) {
      var entityData = {};

      (entityConfig.attributes || []).forEach( attr => {
          if(data[attr]) {
              entityData[attr] = data[attr];
          }
      });

      return typeof extendObj === 'object' ? Object.assign(extendObj, entityData) : entityData;
    }
}

/**
 * parses all objects to entities
 * @param  {array} data rows read from csv files
 * @return {object} keys according to configuration (keywords, ads, ..), values parsed entities from @data
 */
function parseAll(data, cfg) {
  console.log('start parsing');

  var identifierNames = Object.keys(cfg),
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
      entityKey = getIdKey(identifierName, record, cfg);

      if( entityKey && (entityData = parseEntity(identifierName, record, result[identifierName][entityKey], cfg )) ) {
        result[identifierName][entityKey] = entityData;
        isParsed = true;
      }
    }

    if(!isParsed) {
      unparsedRows++;
    }
  }

  console.log('finished parsing with', Object.keys(result));
  return result;
}

/**
 * compares two data sets by entity types (keys)
 * @param  {object} one map of entity type => enitity object (campaign.'Campaign A key' = {...})
 * @param  {object} two map of entity type => enitity object (campaign.'Campaign A key' = {...})
 */
function compareAll(one, two) {
  var types = _.uniq(Object.keys(one).concat(Object.keys(two)));

  types.forEach(type => {
      compareByType(one[type], two[type], type);
  });
}

/**
 * compares all entities of a type (ad, keyword, ...)
 *  - checks first, if the entiy is either new or is missing
 *  - if existent in both sets, compares the entity by attributes
 *
 * @param  {object} one  map of entities for the specific type
 * @param  {object} two  map of entities for the specific type
 * @param  {string} type entity type (ad, keywords, ...)
 */
function compareByType(one, two, type) {
  var CHANGE = config.changeIndicators,
      entityKeys = _.uniq(Object.keys(one).concat(Object.keys(two)));

  checkedCounters[type] = 0; // init counter

 entityKeys.forEach( entityKey => {
    checkedCounters[type]++;

    if(one.hasOwnProperty(entityKey) ? !two.hasOwnProperty(entityKey) : two.hasOwnProperty(entityKey)) {
      var operator = one.hasOwnProperty(entityKey) ? CHANGE.DELETED : CHANGE.NEW;
      handleDiff(operator, type, entityKey);
    } else {
      compareByAttributes(one[entityKey], two[entityKey], type, entityKey);
    }
 });
}

/**
 * compares an entity by attributes
 * @param  {object} one        object attribute => value
 * @param  {object} two        object attribute => value
 * @param  {string} type       entity type
 * @param  {string} entityKey  entity key
 * @return {[type]}            [description]
 */
function compareByAttributes(one, two, type, entityKey) {
  var CHANGE = config.changeIndicators,
      attributes = _.uniq(Object.keys(one).concat(Object.keys(two)));

  attributes.forEach( attr => {
    if(one.hasOwnProperty(attr) ? !two.hasOwnProperty(attr) : two.hasOwnProperty(attr)) {
      var operator = one.hasOwnProperty(attr) ? CHANGE.ATTR_DELETED : CHANGE.ATTR_NEW;
      handleDiff(operator, printf('%s [%s]', type, attr), entityKey);
    }
    else if (one[attr] !== two[attr]) {
      handleDiff(
        CHANGE.ATTR_CONFLICT,
        printf('%s [%s]', type, attr),
        entityKey,
        printf('"%s" <> "%s"', one[attr], two[attr])
      );
    }
 });
}

/**
 * pocesses the detected diff
 * @param  {string} diffSymbol diff indication
 * @param  {string} location   entity type (entity attribute) which are affected
 * @param  {string} key        entity key
 * @param  {string} text       additional text
 */
function handleDiff(diffSymbol, location, key, text) {
  if(outputFile) {
    fs.appendFile(outputFile, diffSymbol + '\t' + location + '\t' + key + '\t' + (text||'') + '\n');
  } else {
    console.log(printf('\t%s  %-40s: "%s":\t%s', diffSymbol, location, key, text || ''));
  }
}



//  STARTS EXECUTION
var startTime = Date.now();

$.when(readFile(fileOne), readFile(fileTwo))
  .then((dataOne, dataTwo)=>{
    var entityMapping = config.entityMapping,
        alternativeMapping = (config.alternativeMapping === true ? config.entityMappingAlternative : null) || entityMapping;

    compareAll(
      parseAll(dataOne, config.entityMapping),
      parseAll(dataTwo, alternativeMapping)
    )
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

    if(outputFile) {
      console.log('THE RESULTS WERE EXPORTED TO: ' + outputFile)
    }
  });




