
/**
 * configuration for entities
 * the identifiers property is responsible for building a unique identifying key, which is the key for comaprison
 * the attributes property represents the variable or describing part of entities
 */

module.exports = {

  // default settings for csv
  defaultCsvSettings: {delimiter: "\t", quote: '"'},

  // configuration of unique identifying and variable columns
  // this configuration is used to parse data from CSV files
  entityMapping: {
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
  },

  // enables alternative mapping for the second file
  alternativeMapping: false,

  // alternative configuration which can be used for the second file
  // this might be useful for comparing two files which have different column names
  // comment this out or set alternativeMapping=false if general mapping should be used
  entityMappingAlternative: {
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
  },

  // how changes should be displayed
  changeIndicators: {
    NEW: '+++',           // a new enity (in file two, but not in one)
    DELETED: '---',       // a missing enity (in file one, but not in two)
    ATTR_NEW: '! +',      // a new enity attribute (in file two, but not in one)
    ATTR_DELETED: '! -',  // a missing enity attribute (in file one, but not in two)
    ATTR_CONFLICT: '!<>'  // a changed enity attribute (value is different in both files)
  }
};

