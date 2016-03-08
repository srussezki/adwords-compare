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

### Example
```
$ npm test

2 entities read from file test1.csv
2 entities read from file test2.csv
start parsing
finished parsing with [ 'campaign', 'adgroup', 'ad', 'keyword' ]
start parsing
finished parsing with [ 'campaign', 'adgroup', 'ad', 'keyword' ]
        ---  campaign                                : "Campaign A":
        !<>  campaign [Campaign Daily Budget]        : "Campaign C":    "Campaign Daily Cudget C" <> "Campaign Daily Cudget CC"
        !<>  campaign [Location]                     : "Campaign C":    "Location C" <> "Location CC"
        !<>  campaign [Language]                     : "Campaign C":    "Language C" <> "Language CC"
        !<>  campaign [ID]                           : "Campaign C":    "ID C" <> "ID CC"
        !<>  campaign [Campaign Status]              : "Campaign C":    "Campaign Status C" <> "Campaign Status CC"
        +++  campaign                                : "Campaign B":
        ---  adgroup                                 : "Campaign A > Ad group A":
        !<>  adgroup [Ad group Status]               : "Campaign C > Ad group C":       "Ad group Status C" <> "Ad group Status CC"
        !<>  adgroup [Max cpc]                       : "Campaign C > Ad group C":       "Max cpc C" <> "Max cpc CC"
        +++  adgroup                                 : "Campaign B > Ad group B":
        ---  ad                                      : "Campaign A > Ad group A > Headline A > Description Line 1 A > Description Line 2 A > Display Url A":
        !<>  ad [Device Preference]                  : "Campaign C > Ad group C > Headline C > Description Line 1 C > Description Line 2 C > Display Url C":    "Device Preference C" <> "Device Preference CC"
        !<>  ad [Final URL]                          : "Campaign C > Ad group C > Headline C > Description Line 1 C > Description Line 2 C > Display Url C":    "Final URL C" <> "Final URL CC"
        +++  ad                                      : "Campaign B > Ad group B > Headline B > Description Line 1 B > Description Line 2 B > Display Url B":
        ---  keyword                                 : "Campaign A > Ad group A > Keyword A > Criterion Type A":
        !<>  keyword [Status]                        : "Campaign C > Ad group C > Keyword C > Criterion Type C":        "Status C" <> "Status CC"
        !<>  keyword [Tracking template]             : "Campaign C > Ad group C > Keyword C > Criterion Type C":        "Tracking template C" <> "Tracking template CC"
        !<>  keyword [Custom parameter]              : "Campaign C > Ad group C > Keyword C > Criterion Type C":        "Custom parameter C" <> "Custom parameter CC"
        +++  keyword                                 : "Campaign B > Ad group B > Keyword B > Criterion Type B":
script runtime: 34ms
checked:  {
        "campaign": 3,
        "adgroup": 3,
        "ad": 3,
        "keyword": 3
}
```

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
