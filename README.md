
# TimeOff.Management

Web application for managing employee absences.

<a href="https://travis-ci.org/timeoff-management/timeoff-management-application"><img align="right" src="https://travis-ci.org/timeoff-management/timeoff-management-application.svg?branch=master" alt="Build status" /></a>

## Features

**Multiple views of staff absences**

Calendar view, Team view, or Just plain list.

**Tune application to fit into your company policy**

Add custom absence types: Sickness, Maternity, Working from home, Birthday etc. Define if each uses vacation allowance.

Optionally limit the amount of days employees can take for each Leave type. E.g. no more than 10 Sick days per year.

Setup public holidays as well as company specific days off.

Group employees by departments: bring your organisational structure, set the supervisor for every department.

Customisable working schedule for company and individuals.

**Third Party Calendar Integration**

Broadcast employee whereabouts into external calendar providers: MS Outlook, Google Calendar, and iCal.

Create calendar feeds for individuals, departments or entire company.

**Three Steps Workflow**

Employee requests time off or revokes existing one.

Supervisor gets email notification and decides about upcoming employee absence.

Absence is accounted. Peers are informed via team view or calendar feeds.

**Access control**

There are following types of users: employees, supervisors, and administrators.

Optional LDAP authentication: configure application to use your LDAP server for user authentication.

**Ability to extract leave data into CSV**

Ability to back up entire company leave data into CSV file. So it could be used in any spreadsheet applications.

**Works on mobile phones**

The most used customer paths are mobile friendly:

* employee is able to request new leave from mobile device

* supervisor is able to record decision from the mobile as well.

**Lots of other little things that would make life easier**

Manually adjust employee allowances
e.g. employee has extra day in lieu.

Upon creation employee receives pro-rated vacation allowance, depending on start date.

Email notification to all involved parties.

Optionally allow employees to see the time off information of entire company regardless of department structure.

## Screenshots

![TimeOff.Management Screenshot](https://raw.githubusercontent.com/timeoff-management/application/master/public/img/readme_screenshot.png)

## Installation

### Cloud hosting

Visit http://timeoff.management/

Create company account and use cloud based version.

### Self hosting

Install TimeOff.Management within your infrastructure.

Prerequisites:
- Node.js 18+ (Node 22 supported). Use `nvm` if possible.
- Git and a working C/C++ toolchain are not required for a standard install (sqlite3 is prebuilt).

Recommended install steps:
```bash
git clone https://github.com/timeoff-management/application.git timeoff-management
cd timeoff-management

# If you see "Invalid Version" errors from an old lockfile, remove it
rm -f package-lock.json

npm install

# Build CSS (uses dart-sass)
npm run compile-sass

# Start the app
npm start
```
Open http://localhost:3000/ in your browser.

Notes:
- The project now uses `sqlite3@^5` and `sass` (dart-sass) instead of `node-sass` to avoid native build issues on modern Node.
- If you use a different Node version per machine, consider adding an `.nvmrc` (e.g., `18`).

## Run tests

We have quite a wide test coverage, to make sure that the main user paths work as expected.

Please run them frequently while developing the project.

Make sure you have Chrome driver installed in your path and Chrome browser for your platform.

If you want to see the browser execute the interactions prefix with `SHOW_CHROME=1`

```bash
USE_CHROME=1 npm test
```

(make sure that application with default settings is up and running)

Any bug fixes or enhancements should have good test coverage to get them into "master" branch.

## Updating existing instance with new code

In case one needs to patch existing instance of TimeOff.Managenent application with new version:

```bash
git fetch
git pull origin master
npm install
npm run-script db-update
npm start
```

## Run in background (forever)

Recommended: PM2 process manager
- Install: `npm i -g pm2`
- Start: `pm2 start bin/wwww --name timeoff`
- Persist reboots: `pm2 save && pm2 startup` (run the printed command)
- Manage: `pm2 status`, `pm2 logs timeoff`, `pm2 restart timeoff`, `pm2 stop timeoff`

Alternative: macOS Launchd
- Create a LaunchAgent with `KeepAlive=true` pointing to `node /absolute/path/to/bin/wwww` and load with `launchctl`.

## Docker

This repository includes a Dockerfile based on `node:22-slim` for reliable installs on modern Node.

Prerequisite: Docker daemon must be running (Docker Desktop on macOS). Verify with `docker info`.

Build and run:
```bash
docker build -t timeoff .
docker run -d --name timeoff -p 3000:3000 --restart unless-stopped timeoff
```
Then open http://localhost:3000/.

If you prefer BuildKit/buildx:
```bash
docker buildx build --load -t timeoff .
```

## How to?

There are some customizations available.

## How to amend or extend colours available for colour picker?
Follow instructions on [this page](docs/extend_colors_for_leave_type.md).

## Customization

There are few options to configure an installation.

### Make sorting sensitive to particular locale

Given the software could be installed for company with employees with non-English names there might be a need to
respect the alphabet while sorting customer entered content.

For that purpose the application config file has `locale_code_for_sorting` entry.
By default the value is `en` (English). One can override it with other locales such as `cs`, `fr`, `de` etc.

### Force employees to pick type each time new leave is booked

Some organizations require employees to explicitly pick the type of leave when booking time off. So employee makes a choice rather than relying on default settings.
That reduce number of "mistaken" leaves, which are cancelled after.

In order to force employee to explicitly pick the leave type of the booked time off, change `is_force_to_explicitly_select_type_when_requesting_new_leave`
flag to be `true` in the `config/app.json` file.

## Use Redis as a sessions storage

Follow instructions on [this page](docs/SessionStoreInRedis.md).

## Feedback

Please report any issues or feedback to <a href="https://twitter.com/FreeTimeOffApp">twitter</a> or Email: pavlo at timeoff.management
