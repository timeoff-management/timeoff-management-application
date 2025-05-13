# TimeOff Management

A comprehensive web application to manage employee absences, vacations, and leaves efficiently. It offers multiple views, customizations, and integrations with third-party calendar systems.

[![Build Status](https://travis-ci.org/timeoff-management/timeoff-management-application.svg?branch=master)](https://travis-ci.org/timeoff-management/timeoff-management-application)

---

## Features

- **Multiple Views of Staff Absences**: Calendar view, Team view, or list format for better visualization.
- **Custom Absence Types**: Define custom absence types like Sick Leave, Maternity, WFH, Birthday, etc., with configurable vacation allowances.
- **Leave Limits**: Set restrictions on the number of leave days per employee (e.g., no more than 10 sick days per year).
- **Public Holidays & Days Off**: Set company-specific holidays or days off.
- **Department Structuring**: Group employees by department and assign supervisors.
- **Custom Work Schedules**: Define working hours for the company and individual employees.
- **Third-Party Calendar Integration**: Sync absence data with external calendar providers (MS Outlook, Google Calendar, iCal).
- **Email Notifications**: Notify supervisors and peers when a leave is requested or approved.
- **CSV Export**: Export leave data into CSV for reporting or backup.
- **Mobile-Friendly**: Fully responsive, enabling employees and supervisors to manage time off from mobile devices.

---

TimeOff Management - Architecture Diagram
___________________________________________________________________________________________

+-----------------------------------------------------------------------------------------+
|                                                                                         |
|                                   User Interface                                        |
|                                   -----------------                                     |
|                                                                                         |
|  +---------------------+     +---------------------+     +---------------------+        |
|  |                     |     |                     |     |                     |        |
|  |   Web Browser       |     |   Mobile Devices    |     |   Third-Party      |        |
|  |   (Responsive UI)   |     |   (Responsive UI)   |     |   Calendars        |        |
|  |                     |     |                     |     | (Google, Outlook)  |        |
|  +----------+----------+     +----------+----------+     +----------+----------+        |
|             |                           |                           |                   |
|             |                           |                           |                   |
+-----------------------------------------------------------------------------------------+
             |                           |                           |
             v                           v                           v
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|                                  Application Layer                                      |
|                                  -----------------                                      |
|                                                                                         |
|  +---------------------+     +---------------------+     +---------------------+        |
|  |                     |     |                     |     |                     |        |
|  |   Node.js Server    |     |   REST API          |     |   Email Service     |        |
|  |   (Express.js)      +<----+   (Endpoints)       +----->   (Notifications)   |        |
|  |                     |     |                     |     |                     |        |
|  +----------+----------+     +---------------------+     +---------------------+        |
|             |                                                                           |
|             |                                                                           |
+-----------------------------------------------------------------------------------------+
             |
             v
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|                                  Data Layer                                             |
|                                  ----------                                             |
|                                                                                         |
|  +---------------------+     +---------------------+     +---------------------+        |
|  |                     |     |                     |     |                     |        |
|  |   SQLite Database   |     |   CSV Exports       |     |   AWS RDS           |        |
|  |   (Primary Storage) |     |   (Reports/Backup)  |     |   (Optional)        |        |
|  |                     |     |                     |     |                     |        |
|  +---------------------+     +---------------------+     +---------------------+        |
|                                                                                         |
+-----------------------------------------------------------------------------------------+

___________________________________________________________________________________________

+-----------------------------------------------------------------------------------------+
|                                                                                         |
|                                  Infrastructure                                        |
|                                  ---------------                                        |
|                                                                                         |
|  +---------------------+     +---------------------+     +---------------------+        |
|  |                     |     |                     |     |                     |        |
|  |   AWS ECS          |     |   AWS VPC           |     |   CI/CD Pipeline    |        |
|  |   (Docker Containers|<----+   (Networking)      +----->   (GitHub Actions   |        |
|  |                     |     |                     |     |    + Terraform)     |        |
|  +---------------------+     +---------------------+     +---------------------+        |
|                                                                                         |
+-----------------------------------------------------------------------------------------+


Key Components:

User Interface Layer:

Web browser (responsive design)

Mobile devices (responsive design)

Third-party calendar integrations (Google, Outlook)

Application Layer:

Node.js server with Express.js

REST API endpoints

Email notification service

Data Layer:

SQLite database (primary storage)

CSV export functionality

Optional AWS RDS for production

Infrastructure Layer:

AWS ECS with Docker containers

AWS VPC for networking

CI/CD pipeline (GitHub Actions + Terraform)

Key Flows:

Users interact via web/mobile interfaces

Application processes requests via Node.js server

Data is stored in SQLite (or RDS in production)

Notifications sent via email service

CI/CD pipeline handles automated deployments

The architecture shows:

Horizontal layers of responsibility

Key integration points (third-party calendars, email)

Deployment infrastructure

Data storage options

CI/CD automation

## Installation

### Prerequisites

- **Node.js** (v4.0.0 or higher)
- **SQLite** (for database management)

### Local Setup (Self-Hosting)

1. Clone the repository:
   ```bash
   git clone https://github.com/timeoff-management/application.git timeoff-management
   cd timeoff-management


Install dependencies:

bash
Copy
Edit
npm install
Start the application:

bash
Copy
Edit
npm start
Access the application by opening your browser and navigating to http://localhost:3000.

Running Tests
To ensure the application is working as expected, you can run the tests. Make sure Chrome is installed on your machine.

bash
Copy
Edit
USE_CHROME=1 npm test
Updating an Existing Instance
To update your instance of TimeOff Management with the latest version:

Fetch the latest code:

bash
Copy
Edit
git fetch
git pull origin master
Install any new dependencies:

bash
Copy
Edit
npm install
Update the database schema if required:

bash
Copy
Edit
npm run-script db-update
Restart the application:

bash
Copy
Edit
npm start
CI/CD with GitHub Actions & Terraform
To automate the Continuous Integration (CI) and Continuous Deployment (CD) process, we have implemented GitHub Actions and Terraform. Below are the steps for setting up the CI/CD pipeline.

CI/CD Setup with GitHub Actions
GitHub Actions Workflow:
We have defined the GitHub Actions workflow under .github/workflows/ci-cd.yml. The pipeline does the following:

Build and Test: The workflow runs npm install to install dependencies and npm test to execute the tests.

Linting: Ensures that the code is consistent and follows best practices.

Terraform Plan and Apply: It validates the infrastructure changes using Terraform and applies them to the AWS environment.

Terraform Integration:

Terraform Configuration: The Terraform configuration is located in the terraform/ directory.

Infrastructure as Code (IaC): The application infrastructure is defined using Terraform for provisioning AWS resources like ECS, RDS, and VPC.

Automated Deployment: Upon successful tests and validation, Terraform deploys the infrastructure to the AWS cloud, including deploying the application to AWS ECS.

How Terraform is Used:
Terraform Init: Initializes the Terraform configuration.

Terraform Plan: Validates the Terraform plan to ensure no issues.

Terraform Apply: Deploys the infrastructure changes to AWS (ECS, RDS, VPC, etc.).

AWS Infrastructure Deployment
ECS: Deploys the TimeOff Management application on Amazon ECS using Docker containers.

RDS: Configures an RDS instance for SQLite or other database options.

VPC: Provisions a VPC and configures security groups, subnets, and IAM roles for the ECS tasks.
