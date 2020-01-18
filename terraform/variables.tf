# VARIABLES #

variable "environment_info" {}

variable "billing_info" {}

variable "aws_region" {
  default = "us-west-2"
}

variable "access_key" {}

variable "secret_key" {}

variable "private_key" {}

variable "company_name" {}

variable "project" {
  default = "devops-challenge"
}

variable "github_repo" {}

variable "pipeline-s3bucket"{
  default = "gorilla-logic-pipeline-s3bucket"
}

variable "network_address_space" {
  default = "10.0.0.0/16"
}

variable "aws-ami" {
  description = "Autoscaling AMI"
  default = {  
  us-west-2 = "ami-04590e7389a6e577c" 
  }
}