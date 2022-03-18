generate "provider" {
  path = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents = <<EOF
terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}
provider "aws" {
  assume_role {
    role_arn     = var.role_arn
    session_name = var.session_name
  }
  region = var.region
}
EOF
}
inputs = {
  region     = "us-east-1"
  account_id = "919549532909"
}