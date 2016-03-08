# adwords-compare

## TL;DR
This nodejs script is is meant to be a comparison script for hierarchical structures stored in csv format - such as Google AdWords exports.

There is no entitlement to completeness, accurateness or performance, as another purpose of writing this script for me was to get familiar with nodejs.

## How to install?
```
 $ npm install
```

## How to run?
```
 $ node index.js test1.csv test2.csv # with node
 $ npm start test1.csv test2.csv # with npm
 $
 $ npm test # for running an example
```
## Output
 - change indicator
 - affected entity type [affected entity attribute (optional)]
 - affected entity key (defined by identifiers in config file)
 - detailed information (optional)

## Prerequisites
Both files have to be UTF8 encoded.

## Optional Parameters
 - -o outputfile
 - -d delimiter for csv file
 - -q quotation for csv file

## Configuration
The default configuration is defined in `config.js`.
 - `defaultCsvSettings` default configuration for [csvtojson](https://libraries.io/npm/csvtojson)
 - `entityMapping` reading the rows line by line this configuration defines how each row can be mapped to an entity. The keys represent an entity type. The `identifiers` (array) define the unique attributes of an entity. `attributes` represent the variable parts of an entity.
 - `alternativeMapping` (boolean) enables an alternative mapping for the file provided as a second parameter. This way it is possible to compare two files with different columns.
 - `entityMappingAlternative` if `alternativeMapping` is enabled, this object will be used as `entityMapping` for the file provided as the second parameter.
 - `changeIndicators` defines how changes should be displayed
