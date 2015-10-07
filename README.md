
# TimeOff manager

Web application for managing employees absence.

<a href="https://travis-ci.org/vpp/timeoff-management"><img align="right" src="https://travis-ci.org/vpp/timeoff-management.svg" alt="Build status" /></a>

<a href="https://codeclimate.com/github/vpp/timeoff-management"><img  src="https://codeclimate.com/github/vpp/timeoff-management/badges/gpa.svg" /></a>

[![Stories in Ready](https://badge.waffle.io/vpp/timeoff-management.png?label=ready&title=Ready)](https://waffle.io/vpp/timeoff-management)

## Features 

**Company departments**

 Create departments to group employees, each one has its own manager.

**Customised Leave types** 

Holidays, Sickness, Maternity, Paternity, Working from home, you name it. Configure if each of them uses vacation allowance or not.

**Customised public holidays** 

Setup public holidays as well as company specific dates.

**Simple workflow** 

Employee requests a leave, manager says yes or no.

**Accesss control** 

There are following types of users: employees, supervisors, and administrators.

**Multiple views**

Leaves are presented via "calendar" view, "wall chart" view, or as a list.

**Email notifications**

All involved employees are notified about leave request status.

**Integration with third parties calendars**

Information about employees leaves could be broadcasted to all major calendar providers: MS Outlook, Google Calendar, Apple Calendar. "Calendar" and "wall chart" views could be shared.

## Installation

### Cloud hosting

Visit http://timeoff.management/ 

Create company account and use cloud based version.

### Self hosting

Install TimeOff Manager within your infrastructure:

(make sure you have Node.js installed)

```bash
git clone git@github.com:vpp/timeoff-management.git
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

Please report any issues or feedback to <a href="https://twitter.com/FreeTimeOffApp">twitter</a> or <a href="https://waffle.io/vpp/timeoff-management">waffle board</a>.

Statistics for processed tickets:

[![Throughput Graph](https://graphs.waffle.io/vpp/timeoff-management/throughput.svg)](https://waffle.io/vpp/timeoff-management/metrics)

