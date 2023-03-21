
###########################################################
# Gorila POC
###########################################################

module "vpc" {
  source                     = "./modules/network/vpc"
  org_name                   = local.org_name
  vpc_cidr_block_prefix_code = "16"
  environment_tag            = local.environment
  num_of_nat_gw_eip          = 2
  region                     = var.aws_region

  ingress_blocks = [
    {
      cidr_blocks = [
        "0.0.0.0/0"
      ]
      description      = "web-app-traffic"
      from_port        = 80
      ipv6_cidr_blocks = []
      prefix_list_ids  = []
      protocol         = "tcp"
      security_groups  = []
      self             = false
      to_port          = 80
    },
    {
      cidr_blocks = [
        "0.0.0.0/0"
      ]
      description      = "web-app-secure-traffic"
      from_port        = 443
      ipv6_cidr_blocks = []
      prefix_list_ids  = []
      protocol         = "tcp"
      security_groups  = []
      self             = false
      to_port          = 443
    },
  ]
}

module "kms_key" {
  source                  = "./modules/encrypt/kms"
  create_key              = true
  description             = "ECR Repository Encryption - Managed by Terraform"
  deletion_window_in_days = 30
  enable_key_rotation     = false
  org_name                = local.org_name
  aws_region              = var.aws_region
  alias                   = "ecr-key"
}

#------------------------------------------------------------------------------
# ECR Registry
#------------------------------------------------------------------------------

module "ecr" {
  source = "./modules/storage/ecr"

  m_ecr_registry_name = [
    "timeoff",
    "cidi"
  ]
  m_ecr_image_tag_mutability = "MUTABLE"
  m_ecr_scan_on_push         = true
  m_ecr_org_name             = local.org_name
  m_ecr_aws_region           = var.aws_region
  encryption_configuration = {
    encryption_type = "KMS"
    kms_key         = module.kms_key.key_arn
  }
}


#------------------------------------------------------------------------------
# ECS Cluster
#------------------------------------------------------------------------------


# resource "aws_acm_certificate" "cert" {
#   domain_name       = "example.com"
#   validation_method = "DNS"

#   tags = {
#     Environment = "test"
#   }

#   lifecycle {
#     create_before_destroy = true
#   }
# }

module "fargate" {
  source                       = "./modules/ecs/fargate"
  aws_region                   = var.aws_region
  app_image                    = "042112416138.dkr.ecr.us-east-1.amazonaws.com/timeoff:latest"
  app_port                     = 3000
  app_count                    = 2
  vpc_id                       = module.vpc.vpc_id
  vpc_public_subet_ids         = module.vpc.public_subnet_ids
  vpc_private_subet_ids        = module.vpc.private_subnet_ids
  task_family                  = "to-app-family"
  ecs_cluster_name             = "${local.environment}-gorila"
  ecs_cluster_service_name     = "time-off-srv"
  vpc_default_sg_id = module.vpc.default_security_group_id
}
