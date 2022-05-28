locals {
  availability_zones = length(var.availability_zones) > 0 ? var.availability_zones : ["${var.region}a", "${var.region}c"]
  private_subnets    = length(var.private_subnets) > 0 ? var.private_subnets : [cidrsubnet(var.cidr_block, 8, 1), cidrsubnet(var.cidr_block, 8, 2)]
  public_subnets     = length(var.public_subnets) > 0 ? var.public_subnets : [cidrsubnet(var.cidr_block, 8, 100), cidrsubnet(var.cidr_block, 8, 101)]
  log_prefix         = "${var.environment}/logs"
}
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.14.0"

  name = var.environment
  cidr = var.cidr_block

  azs             = local.availability_zones
  private_subnets = local.private_subnets
  private_subnet_tags = {
    Tier = "Private"
  }

  public_subnets = local.public_subnets
  public_subnet_tags = {
    Tier = "Public"
  }

  enable_vpn_gateway     = true
  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = false
  enable_dns_hostnames   = true
  enable_dns_support     = true
}

# Logs for VPC
resource "aws_flow_log" "flow_logs" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = module.vpc.vpc_id
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name = "${var.environment}-alb-logs"
}

resource "aws_iam_role" "flow_logs" {
  name               = "${var.environment}-alb-logs"
  assume_role_policy = data.aws_iam_policy_document.flow_logs_assume.json
}

data "aws_iam_policy_document" "flow_logs_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["vpc-flow-logs.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "flow-logs" {
  name   = "${var.environment}-alb-logs"
  role   = aws_iam_role.flow_logs.id
  policy = data.aws_iam_policy_document.flow_logs.json
}

data "aws_iam_policy_document" "flow_logs" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams"
    ]
    resources = ["*"]
  }
}

data "aws_caller_identity" "this" {}

data "aws_elb_service_account" "this" {}

resource "aws_lb" "this" {
  name               = var.environment
  internal           = false
  load_balancer_type = "application"
  security_groups    = [module.web_security_group.security_group_id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = true

  access_logs {
    bucket  = data.aws_s3_bucket.logging_bucket.id
    prefix  = local.log_prefix
    enabled = true
  }
}

# Grant S3 bucket access for logging
data "aws_s3_bucket" "logging_bucket" {
  bucket = var.log_bucket_name
}


resource "aws_s3_bucket_policy" "logging_bucket" {
  policy = data.aws_iam_policy_document.logging_bucket.json
  bucket = data.aws_s3_bucket.logging_bucket.id
}

data "aws_iam_policy_document" "logging_bucket" {
  statement {
    effect = "Allow"
    actions = [
      "s3:PutObject",
    ]
    principals {
      type        = "AWS"
      identifiers = [data.aws_elb_service_account.this.arn]
    }
    resources = ["arn:aws:s3:::${data.aws_s3_bucket.logging_bucket.id}/${local.log_prefix}/AWSLogs/${data.aws_caller_identity.this.account_id}/*"]
  }
}

# ALB SGs
module "web_security_group" {
  source      = "terraform-aws-modules/security-group/aws"
  version     = "4.9.0"
  name        = "${var.environment}-alb-sg"
  description = "Web Traffic SG"
  vpc_id      = module.vpc.vpc_id
  ingress_with_cidr_blocks = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      description = "HTTP Ports"
      cidr_blocks = "0.0.0.0/0"
    },
    {
      from_port   = 444
      to_port     = 444
      protocol    = "tcp"
      description = "HTTPS Port"
      cidr_blocks = "0.0.0.0/0"
    }
  ]
  egress_with_cidr_blocks = [
    {
      from_port   = 0
      to_port     = 65535
      protocol    = "tcp"
      description = "All ports"
      cidr_blocks = "0.0.0.0/0"
    },
  ]
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = "80"
  protocol          = "HTTP"
  default_action {
    type = "redirect"

    redirect {
      port        = "444"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = "444"
  protocol          = "HTTPS"
  certificate_arn   = "arn:aws:acm:us-east-1:150068533141:certificate/aa7e4852-b847-4a23-b2c4-30c0a6c406fe"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Bad Request"
      status_code  = "400"
    }
  }
}

