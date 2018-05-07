(function() {
  'use strict';
  angular
    .module('app.main')
    .factory('timeFactory', timeFactory);
  /**
  * @return {object} "time to date-object" Konverter-Funktionen
  * werden bereit gestellt.
  **/
  function timeFactory() {
    let service = {

      converter: converter, /* Converts multiple expediture arrays */
      convert: convert, /* Converts single expediture array. */

  };

  return service;
    /**
     * @param {JSON-Object} docs time and date needs to be converted back to
     * date-object
     * after an operation has took place.
     * @return {JSON-Object} docs overwritten documents
    */
    function converter(docs) {
      if (docs) {
        docs.start = new Date(docs.start);
        docs.end = new Date(docs.end);
        if (docs.time) {
          if (
            moment(docs.time, 'HH:mm:ss')
            .isValid() ||
            moment
            .duration(docs.time, 'HH:mm:ss')
            .format('HH:mm:ss') !== '00'
          ) {
            /* If hours are greater 1000 we need this regex*/
            docs.time = docs.time.replace(/[^:.0-9]/g, '');

            /**
             For times < 24 hours moment should handle the conversion.
             If time exceeds 24 hours duration is needed,
             since moment resets at 24 hours.
            */
            if (
              moment
              .duration(docs.time, 'HH:mm:ss')
              .asSeconds() < 86400
            ) {
              docs.time = moment(docs.time, 'HH:mm:ss')
              .format('HH:mm:ss');
            } else {
              docs.time = moment
              .duration(docs.time, 'HH:mm:ss')
              .format('HH:mm:ss')
              .replace(/[^:.0-9]/g, '');
            }
          } else {
            /* If the input isn´t a valid time the last value
            from DB gets restored */
            db.get(docs._id).then((doc) => {
              docs.time = doc.time;
            });
          }
        }
      }
      return docs;
    };

    /**
      * Is used to convert a variety of Userinputs into valid time formats
      * for stopwatch before putting into Database.
      * It also asserts the given values. The convert function first checks
      * if the given array * has 1 or n entrys, because
      * the foor loop process them differently.
      * @param {object} docs
      * @return {object} returns one or several documents after conversion.
    */
    function convert(docs) {
      return new Promise((resolve, reject) => {
        if (docs.length) {
          for (let k in docs) {
            if (docs[k]) {
              converter(docs[k]);
            }
          }
          Promise.all(docs)
          .then((dataAll) => {
            resolve(dataAll);
          });
        } else {
          resolve(converter(docs));
        }
      });
    };
  }
}());
