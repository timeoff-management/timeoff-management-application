provider "aws" {
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::042112416138:role/iac-to-master"
  }
  default_tags {
    tags = {
      Owner   = "mariohdzflores@gmail.com"
      NonProd = true
    }
  }
}

