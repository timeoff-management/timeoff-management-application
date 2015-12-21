
# TimeOff manager

Web application for managing employees absence.

<a href="https://travis-ci.org/timeoff-management/application"><img align="right" src="https://travis-ci.org/timeoff-management/application.svg?branch=master" alt="Build status" /></a>

## Features

**Multiple views of staff absence**

Calendar view, Team view, or Just plain list.

**Tune application to fit into your company policy**

Add custom absence types: Sickness, Maternity, Working from home, Birthday etc. Define if each uses vacation allowance.

Setup public holidays as well as company specific days off.

Group employees by departments: bring your organisation structure into, set the supervisor for every department.

**3d Parties Calendar Integration**

Broadcast employees whereabout into external calendar providers: MS Outlook, Google Calendar, and iCal.

**Three Steps Workflow**

Employee request time off or revoke existing one.

Supervisor get email notification and decide about upcoming employee absence.

Absence is accounted. Peers are informed via team view or calendar feeds.

**Accesss control** 

There are following types of users: employees, supervisors, and administrators.

**Lots of other little things that would make life easier**

Manually adjust employees allowance
e.g. employee has extra day in lieu.

Upon creation employee receives pro rata vacation allowance, depending on start date.

Users of three types: admins, supervisors, and employees.

Email notification to all involved parties.


## Installation

### Cloud hosting

Visit http://timeoff.management/

Create company account and use cloud based version (BETA).

### Self hosting

Install TimeOff Manager within your infrastructure:

(make sure you have Node.js installed)

```bash
git clone git@github.com:timeoff-management/application.git
cd timeoff-management
npm install
node bin/www
```
Open http://localhost:3000/ in your browser.

## Run tests

```bash
node node_modules/mocha/bin/mocha --recursive t/*
```

## Feedback

Please report any issues or feedback to <a href="https://twitter.com/FreeTimeOffApp">twitter</a>.

