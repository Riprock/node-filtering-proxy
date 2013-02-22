[
  {
    "name": "4OD ads",
    "match": /^http:\/\/ais\.channel4\.com\/asset\/.+/,
    "filter": function(data) {
      return data.replace(/<adverts>[\s\S]*<\/adverts>/, "");
    }
  },
  {
    "name": "4OD start ads",
    "match": /\/ad\/p\/1\?/,
    "replace": true,
    "filter": function() {
      return "";
    }
  },
  {
    "name": "STV player ad videos",
    "match": /^http:\/\/uk-dev-stv\..+?\.videoplaza\.tv\/creatives\/assets\//,
    "replace": true,
    "filter": function() {
      return "";
    }
  },
  {
    "name": "STV player more ad videos",
    "match": /^http:\/\/http\.videologygroup\.com\/DSPMedia\/.*\.flv/,
    "replace": true,
    "filter": function() {
      return "";
    }
  },
  {
    "name": "STV player more ad videos",
    "match": /^http:\/\/static\.scanscout\.com\/filemanager\/.*\.flv/,
    "replace": true,
    "filter": function() {
      return "";
    }
  }
]
