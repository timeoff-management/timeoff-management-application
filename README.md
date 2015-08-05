# TimeOff manager

Web application for accounting employee days off.

## Features 

**Company departments**

 Create departments to group employees, each one has its own manager.

**Customised Leave types** 

Holidays, Sickness, Maternity, Paternity, Working from home, you name it. Configure if each of them uses vacation allowance or not.

**Customised public holidays**

Setup public holidays as well as company specific dates.

**Simple workflow**

Employee requests a leave, manager says yes or no.

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

## Run tests

```bash
node node_modules/mocha/bin/mocha --recursive t/*
```
