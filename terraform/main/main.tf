#Init Terraform modules------------------------------------------------------------------

module "vpc" {
  source            = "../modules/ec2/vpc"
  app_name          = "${var.app_name}"
  tags              = var.tags
}

module "ecs" {
  source            = "../modules/ecs"
  app_name          = "${var.app_name}"
  tags              = var.tags
}

#Init Terraform configuration-----------------------------------------------------------
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region                  = "${var.region}"
  shared_credentials_file = "~/.aws/credentials"
  profile                 = "gorilla_test"
}

terraform {
  backend "s3" {
    bucket                  = "gorilla-terraform"
    key                     = "gorilla-test/terraform.tfstate"
    region                  = "us-west-2"
    dynamodb_table          = "gorilla-terraform-state-lock"
    shared_credentials_file = "~/.aws/credentials"
    profile                 = "gorilla_test"
  }
}
#End Terraform configuration-----------------------------------------------------------