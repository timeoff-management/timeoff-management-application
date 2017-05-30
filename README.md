
# TimeOff.Management

Web application for managing employees absence.

[![Stories in Ready](https://badge.waffle.io/timeoff-management/application.png?label=ready&title=Ready)](https://waffle.io/timeoff-management/application)

<a href="https://travis-ci.org/timeoff-management/application"><img align="right" src="https://travis-ci.org/timeoff-management/application.svg?branch=master" alt="Build status" /></a>

## Features

**Multiple views of staff absence**

Calendar view, Team view, or Just plain list.

**Tune application to fit into your company policy**

Add custom absence types: Sickness, Maternity, Working from home, Birthday etc. Define if each uses vacation allowance.

Optionally limit the amount of days employee can take for each Leave type. E.g. no more than 10 days of Sick days per year.

Setup public holidays as well as company specific days off.

Group employees by departments: bring your organisation structure into, set the supervisor for every department.

Customisable working schedule for company and individuals.

**Third Party Calendar Integration**

Broadcast employees whereabout into external calendar providers: MS Outlook, Google Calendar, and iCal.

Create calendar feeds for individual, departments or entire company.

**Three Steps Workflow**

Employee request time off or revoke existing one.

Supervisor get email notification and decide about upcoming employee absence.

Absence is accounted. Peers are informed via team view or calendar feeds.

**Accesss control**

There are following types of users: employees, supervisors, and administrators.

Optional LDAP authentification: configure applicationto use your LDAP server for user authentication.

**Seamless data migration betweeen different installations**

User friendly and simple work-flow for data migration between different TimeOff.Management installations.

Admin user can download the entire company data as a single JSON file.

And then restore the account at different installation by simply uploading the JSON.

**Works on mobile phones**

The most used customer paths are mobile friendly:

* employee is able to request new leave from mobile device

* supervisor is able to record decision from the mobile as well.

**Lots of other little things that would make life easier**

Manually adjust employees allowance
e.g. employee has extra day in lieu.

Upon creation employee receives pro rata vacation allowance, depending on start date.

Users of three types: admins, supervisors, and employees.

Email notification to all involved parties.

Optionally allow employees to see the time off information of entire company regardless the department structure.

## Screenshots

![TimeOff.Management Screenshot](https://raw.githubusercontent.com/timeoff-management/application/master/public/img/readme_screenshot.png)

## Installation

### Cloud hosting

Visit http://timeoff.management/

Create company account and use cloud based version.

### Host on Heroku
Click the following button to install TimeOff.Management on Heroku:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Configure the application during setup by filling the according form fields.
The default setup will automatically provision a free PostgreSQL and Mailgun addon. Instead of using Mailgun API for sending mails you can also send mails via SMPT by adding the environment variables `SMTP_SERVER`, `SMTP_PORT`, `SMTP_LOGIN` and `SMTP_PASSWORD`.

### Self hosting

Install TimeOff.Management application within your infrastructure:

(make sure you have Node.js and SQLite installed)

```bash
git clone https://github.com/timeoff-management/application.git timeoff-management
cd timeoff-management
npm install
npm start
```
Open http://localhost:3000/ in your browser.

## Run tests

We have quite a wide test coverage, to make sure that the main user paths work as expected.

Please run them frequently while developing the project.

```bash
npm test
```

(make sure that application with default settings is up and running)

Any bugfixes or enhancements should have good test coverage to get them into "master" branch.

## Updating existing instance with new code

In case one needs to patch existing instance of TimeOff.Managenent application with new version:

```bash
git fetch
git pull origin master
npm install
npm run-script db-update
npm start
```

## Feedback

Please report any issues or feedback to <a href="https://twitter.com/FreeTimeOffApp">twitter</a> or Email: pavlo at timeoff.management
