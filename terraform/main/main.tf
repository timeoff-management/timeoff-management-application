#Init Terraform modules------------------------------------------------------------------

module "vpc" {
  source    = "../modules/ec2/vpc"
  app_name  = "${var.app_name}"
  tags      = var.tags
}

module "alb" {
  source          = "../modules/ec2/alb"
  app_name        = "${var.app_name}"
  vpc_id          = module.vpc.out_vpc
  subnets         = module.vpc.out_subnets
  security_groups = [module.vpc.out_sg]
  tags            = var.tags
  depends_on      = [module.vpc]   
}

module "ecs" {
  source          = "../modules/ecs"
  app_name        = "${var.app_name}"
  subnets         = module.vpc.out_subnets
  security_groups = [module.vpc.out_sg]
  target_group_arn= module.alb.out_lbtg_arn
  tags            = var.tags
  depends_on      = [module.alb] 
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