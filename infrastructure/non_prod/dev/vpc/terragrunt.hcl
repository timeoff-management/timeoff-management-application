include {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules//vpc"
}

locals {
  tags = {
    ProvisionedBy = "Terraform"
    Environment = "non_prod"
  }
}

inputs = {
  name = "non-prod"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false

  tags = local.tags

  zones = {
    "migs-lair.tk" = {
      comment = "mig's lair domain (non_prod)"
      tags = {
        env = "non_prod"
      }
    }
  }
}
