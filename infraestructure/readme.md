# TimeOff.Management Infrastructure Description.

## URL
[timeoff link](https://test-timeoff-management.eastus2.cloudapp.azure.com)

## Building

For an easy creation we created a Terraform script for azure that will create the infrastructure descripbe below, with HTTP and HTTPS enable.

## Infrastructure desing


<img width="358" alt="imagen" src="https://user-images.githubusercontent.com/49290896/117829046-9d779900-b22f-11eb-91a0-954583fa404a.png">

## CI & CD

We have 2 github action forms CI.yml and CD.yaml

CI will run the test for every PR create to make sure that the adding code does not break the application.

CD will be run when you merge code into the master branch ones the CI has completed successfully.

### Note 
We change the alpine version because of issues with packages version when creating docker image.
