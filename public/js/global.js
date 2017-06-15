
/*
 * Book Leave request pop-up window.
 *
 * */
$(document).ready(function(){
  /*
   *  When FROM field in New absense form chnages: update TO one if necessary
   */
  $('input.book-leave-from-input').on('change', function(e){
    e.stopPropagation();

    var from_date = $('input.book-leave-from-input').datepicker('getDate');

    if ( ! from_date ) {
      // no new value for FROM part, do nothing
      console.log('No from date');
      return;
    }

    var to_date = $('input.book-leave-to-input').datepicker('getDate');

    if ( ! to_date || ( to_date && to_date.getTime() < from_date.getTime() )) {
      $('input.book-leave-to-input').datepicker('setDate', $('input.book-leave-from-input').datepicker('getFormattedDate'));
    }
  });
});


/*
 * Bootstrap-datepicker
 *
 * */
!function(a){
  a.fn.datepicker.dates["en-GB"] = {
    days : [
      "Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"
    ],
    daysShort : [
      "Sun","Mon","Tue","Wed","Thu","Fri","Sat"
    ],
    daysMin : [
      "Su","Mo","Tu","We","Th","Fr","Sa"
    ],
    months : [
      "January","February","March","April","May","June","July","August","September","October","November","December"
    ],
    monthsShort : [
      "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
    ],
    today       : "Today",
    monthsTitle : "Months",
    clear       : "Clear",
    weekStart   : 1,
    format      : "dd/mm/yyyy"
  }
}(jQuery);


$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

$(function () {
  $('[data-toggle="popover"]').popover()
})
