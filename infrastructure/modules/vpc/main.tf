module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "v3.13.0"

  name = var.name
  cidr = var.cidr

  azs             = var.azs
  private_subnets = var.private_subnets
  public_subnets  = var.public_subnets

  enable_nat_gateway     = true
  single_nat_gateway     = true
  one_nat_gateway_per_az = false

  tags = {
    Terraform   = "true"
    Environment = "dev"
  }
}

module "zones" {
  source  = "terraform-aws-modules/route53/aws//modules/zones"
  version = "~> 2.0"

  zones = var.zones
  tags  = var.tags
}