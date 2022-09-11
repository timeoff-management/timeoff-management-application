
$(document).ready(function () {
    $('#add_new_department_btn').on('click', function(e){
        $('#add_new_department_row').removeClass('hidden');
    });

    $('button.departments-remove-btn').on('click', function(e){
        var delete_form = $('#delete_form');
        delete_form.attr('action', delete_form.attr('action') + $(this).attr('value') + '/');
        return delete_form.submit();
    });
});
