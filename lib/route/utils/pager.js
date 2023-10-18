/*
 *
 *
 *  This is a module to be used whenever we need to have pagination on any list page.
 *
 *  The module works in conjunction with views/partials/pager.hbs
 *
 *  It exports a function that generates an object that has
 *    * an attribute "items_per_page" wich
 *      globaly defines how many items per page are shown
 *    * a method "get_pager_object" that return the pager object to be passed into the pager.hbs
 *
 *   Pager object has following entries:
 *
 *    * page_prev : number to address previous page, if 0 then previous page is disabled
 *    * page_next : page number to next opage, if 0 no more pages after current one
 *    * page      : number of current page, page counting starts with 1
 *    * filter    : an object that contains other GET parameters to be placed into the
 *                  pager's links; keys are the names of parameters and values are values
 *    * page_qnty : total number of pages available for current pager
 *    * count     : total number of pages items
 *    * pages     : simple array with item for each page, each item is corresponding page number
 *
 * */

'use strict'

module.exports = function() {
  return {
    items_per_page: 10,

    get_pager_object: function(args) {
      var total_items_count = args.total_items_count,
        filter = args.filter,
        page = args.current_page

      var page_qnty = Math.ceil(total_items_count / this.items_per_page)

      var pager = {
        filter: filter,
        page: page,
        page_qnty: page_qnty,
        page_prev: page > 1 ? page - 1 : 0,
        page_next: page >= page_qnty ? 0 : page + 1,
        count: total_items_count,
        pages: Array.apply(null, Array(page_qnty)).map(function(x, i) {
          return i + 1
        })
      }

      return pager
    }
  }
}
