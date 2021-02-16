
# Leave types colour setup

For some organizations the available set of colours is not enough. The page describes how to extend the set and amend the values of available colours.

# Amend colours of available options

## To change the predefined colours one needs:

* to open `scss/main.scss`
* find classes of `leave_type_color_1` or similar
* updated the classes to have relevant color for the `background` property
* run the `npm run compile-sass` command to generate the css file
* comment changes to git.

## To add new colours to the set of available colours

* open handlebar partial file that holds available options for the colour picker: `views/partials/options_for_color_picker.hbs`
* add new option by adding line of following format:
```
<li><a href="#" class="btn btd-default leave_type_color_X" data-tom-color-picker-css-class="leave_type_color_X">Color X</a></li>
```
* * where `X` is next integer from the biggest one available so far
* open `scss/main.scss`
* find classes of `leave_type_color_` shape and add new one `leave_type_color_X` with colour of your choice
* run the `npm run compile-sass` command to generate the css file
* comment changes to git.
