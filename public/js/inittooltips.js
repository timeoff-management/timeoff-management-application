$(function () {
  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="popover-hover"]').popover({ trigger: "hover", html: true });
  $('[data-toggle="popover-summary"]').popover({
    html: true,
    content: $('#summary-popover-table').html()
  }).on('shown.bs.popover', function () {
    // This is for tooltip inside the the popover summary window.
    $('[data-toggle="tooltip"]').tooltip();
  });
});
