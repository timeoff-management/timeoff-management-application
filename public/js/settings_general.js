$(document).ready(function () {
  $("button.leavetype-remove-btn").on("click", function (e) {
    e.stopPropagation();

    var delete_form = $("#delete_leavetype_form");
    delete_form.attr(
      "action",
      delete_form.attr("action") + $(this).attr("value") + "/"
    );

    delete_form.submit();

    return false;
  });
});
