$(document).ready(function() {
  $("button.bankholiday-remove-btn").on("click", function(e) {
    e.stopPropagation();

    var delete_form = $("#delete_bankholiday_form");
    delete_form.attr(
      "action",
      delete_form.attr("action") + $(this).attr("value") + "/"
    );

    delete_form.submit();

    return false;
  });

  $("#bankholiday-import-btn").on("click", function(e) {
    e.stopPropagation();

    var import_form = $("#import_bankholiday_form");

    import_form.submit();

    return false;
  });
});
