var $ = require('jquery-deferred'),
    printf = require('printf'),
    _ = require('lodash'),
    config = require('./config.js'),
    utils = require('./utils.js'),
    fs = require('fs');

// some validation
var args = process.argv.slice(2),
    fileOne = args[args.length-2],
    fileTwo = args[args.length-1],
    outputFile,
    silent = true;

// mapping configuration
var entityMappingOne = config.entityMapping,
    entityMappingTwo = (config.alternativeMapping === true ? config.entityMappingAlternative : null) || entityMappingOne;


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
    case '-v':
      silent = false;
      i--; // without value
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

var stats = {};

/**
 * reads a whole CSV file
 * @return {object} $.Deferred()
 */
function readFile(fileName, cfg) {
  var def = $.Deferred(),
      lineReader = require('readline').createInterface({
        input: require('fs').createReadStream(fileName)
      }),
      obj,
      existentObj,
      data = {},
      values,
      headers,
      i,
      lineNumber = 0,
      mappedCount = 0,
      delimiter = config.defaultCsvSettings.delimiter || ',',
      quote = config.defaultCsvSettings.quote || '"',
      trimBoth = function(string) {
        if(string[0] === quote && string[string.length - 1] === quote) {
          string = string.substr(1, string.length - 2);
        }
        else if(string[0] === quote) {
          string = string.substr(1, string.lenght);
        }
        else if(string[string.length-1] === quote) {
          string = string.substr(0, string.length - 1);
        }
        return string.replace(quote + quote, quote);
      },
      assignToData = function(entity) {
        if(!data.hasOwnProperty(entity.type)) {
          data[entity.type] = {};
        }
        existentObj = data[entity.type][entity.key];
        if(!existentObj) {
          existentObj = {};
          mappedCount++;
        }

        data[entity.type][entity.key] = Object.assign(existentObj, entity.data);
      };

  lineReader.on('line', function (line) {
    lineNumber++;
    values = line.trim().split(delimiter).map(trimBoth);

    if(!headers) {
      headers = values;
    } else {
      // assign to obj
      obj = {};
      for (i = 0; i < headers.length; i++) {
        if(values[i] && values[i].length > 0) {
          obj[ headers[i] ] = values[i];
        }
      }

      parseFromRow(obj, cfg).map(assignToData);
    }
  });

  lineReader.on('close', function(){
    console.log('finished reading file ' + fileName + ' with '+ mappedCount + ' mapped entities' );

    if(mappedCount === 0) {
      def.reject("no entites found in file " + fileName);
    }

    def.resolve(data);
  })

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

      return extendObj && typeof extendObj === 'object' ? Object.assign(extendObj, entityData) : entityData;
    }
}

/**
 * parses all objects to entities from one row
 * @param  {object} rowData
 * @param  {object} cfg mapping configuration
 * @return {array} an array of all mapped entities
 */
function parseFromRow(rowData, cfg) {
  var identifierNames = Object.keys(cfg),
      result = [],
      identifierName,
      entityKey,
      entityData;

  for (var j = 0; j < identifierNames.length; j++) {
    identifierName = identifierNames[j],
    entityKey = getIdKey(identifierName, rowData, cfg),
    entityData = parseEntity(identifierName, rowData, null, cfg );

    if( entityKey && entityData ) {
      result.push({
        key: entityKey,
        type: identifierName,
        data: entityData
      });
    }
  }

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

  return $.Deferred().resolve();
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

 entityKeys.forEach( entityKey => {
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
  }
  else if(!silent) {
    console.log(printf('\t%s  %-40s: "%s":\t%s', diffSymbol, location, key, text || ''));
  }

  stats[location] = stats[location] || {};
  stats[location][diffSymbol] = (stats[location][diffSymbol] || 0) + 1;
}



//  STARTS EXECUTION
var startTime = Date.now();

$.when(readFile(fileOne, entityMappingOne), readFile(fileTwo, entityMappingTwo))
  .then((dataOne, dataTwo)=>{
    compareAll(dataOne, dataTwo);
  })
  .then(()=>{
    if(outputFile) {
      console.log('THE RESULTS WERE EXPORTED TO: ' + outputFile)
    }

    var summary =  [],
        summarySort = function(a, b) {
            return (b.count != a.count) ? b.count - a.count : (a.type > b.type ? 1 : -1);
        };
    Object.keys(stats).forEach(type => {
      Object.keys(stats[type]).forEach(diff => {
        summary.push({
          description: printf('%-40s %-5s %d', type, diff, stats[type][diff]),
          type: type,
          diff: diff,
          count: stats[type][diff]
        });
      });
    });

    if(summary.length === 0) {
      utils.printInBox("THE FILES ARE EQUAL");
    } else {
      console.log('SUMMARY');
      console.log(summary.sort(summarySort).map(itm => "\t"+itm.description+"\n").join(''));
      if(silent) {
        console.log("FOR MORE INFORMATION RUN THE SCRIPT WITH -v PARAMETER OR OUTPUT TO A FILE WITH -o <filename>");
      }
      utils.printInBox("THE FILES ARE DIFFERENT");
    }
  })
  .fail(err => console.log("ERROR", err))
  .always(()=>{
    console.log("SCRIPT RUNTIME: " + (Date.now() - startTime) + 'ms');
  });




