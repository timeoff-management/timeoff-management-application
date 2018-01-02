
'use strict';

/*
 *  Basic scenario for checking time zones:
 *
 *  * Create a copany
 *  * Update Time zone to be somethng in Australia
 *  * Get the date from Book leave modal and put it into today_aus
 *  * Get the current date from Calendar page and ensure it is the same as today_aus
 *  * Get the current date from Team view page and ensure it is the same as today_aus
 *  * Book a leave and ensure its "created at" value on My requests page is today_aus
 *  * Reject newly added leave
 *  * Update Time zone to be USA/Alaska
 *  * Get the date from Book leave modal and put it into today_usa
 *  * Ensure that today_usa is one day behind the today_aus
 *  * Get the current date from Calendar page and ensure it is the same as today_usa
 *  * Get the current date from Team view page and ensure it is the same as today_usa
 *  * Book a leave and ensure its "created at" value on My requests page is today_usa
 *
 * */
