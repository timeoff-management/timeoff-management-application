terraform {
  backend "s3" {
    bucket = "s3-terraform-state-iac"
    key    = "gorila/terraform.tfstate"
    region = "us-east-1"
  }
}