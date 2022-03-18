locals {
  app_name             = "${var.env}-${var.app_name}"
  task_definition_name = "${var.env}-${var.app_name}-tdef"
  target_group_name    = "${var.env}-${var.app_name}-tg"
  cloudwatch_log_group = "${var.env}/${var.app_name}-logs"
  container_name       = var.app_name
  service_name         = "${var.env}-${var.app_name}-service"

  task_definition = templatefile("${path.module}/task_def/task_def.tftpl", {
    app_name             = var.app_name
    account_id           = var.account_id
    memory               = var.memory
    cpu                  = var.cpu
    port                 = var.container_port
    region               = var.region
    env                  = var.env
    container_port       = var.container_port
    cloudwatch_log_group = local.cloudwatch_log_group
  })
}

data "aws_subnet_ids" "public" {
  vpc_id = var.vpc_id
  filter {
    name   = "tag:Name"
    values = ["non-prod-public*"]
  }
}

data "aws_route53_zone" "selected" {
  name = var.domain_name
}

data "aws_iam_policy_document" "ecs_tasks_execution_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_tasks_execution_role" {
  name               = "${var.env}-ecs-task-execution-role"
  assume_role_policy = "${data.aws_iam_policy_document.ecs_tasks_execution_role.json}"
}

resource "aws_iam_role_policy_attachment" "ecs_tasks_execution_role" {
  role       = "${aws_iam_role.ecs_tasks_execution_role.name}"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_ecs_service" "default" {
  name            = local.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.default.arn
  launch_type     = "FARGATE"

  network_configuration {
    security_groups = [aws_security_group.container.id]
    subnets         = data.aws_subnet_ids.public.ids
  }

  load_balancer {
    target_group_arn = module.alb.target_group_arns[0]
    container_name   = local.container_name
    container_port   = var.container_port
  }

  deployment_controller {
    type = var.deployment_controller_type
  }

  lifecycle {
    ignore_changes = [task_definition]
  }

  desired_count                      = var.desired_count
  deployment_maximum_percent         = var.deployment_maximum_percent
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent
  
  tags = var.tags
}

resource "aws_ecs_task_definition" "default" {
  family                   = local.task_definition_name
  network_mode             = var.network_mode
  container_definitions    = local.task_definition
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  task_role_arn            = var.task_role_arn
  execution_role_arn       = aws_iam_role.ecs_tasks_execution_role.arn

  tags = var.tags
}

resource "aws_security_group" "container" {
  name        = "allow_traffic_to_${local.app_name}_ecs_service"
  description = "allow_container_traffic"
  vpc_id      = var.vpc_id

  # ingress {
  #   from_port   = var.container_port
  #   to_port     = var.container_port
  #   protocol    = "TCP"
  #   cidr_blocks = ["0.0.0.0/0"]
  # }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

resource "aws_security_group_rule" "dynamicPorts" {
  description              = "container_port_${local.app_name}"
  type                     = "ingress"
  from_port                = var.container_port
  to_port                  = var.container_port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.listener.id
  security_group_id        = aws_security_group.container.id
}

resource "aws_security_group" "listener" {
  name        = "allow_listener_${local.app_name}_traffic"
  description = "allow_listener_traffic"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.alb_listener_port
    to_port     = var.alb_listener_port
    protocol    = "TCP"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "default" {
  name              = local.cloudwatch_log_group
  retention_in_days = var.retention_in_days

  tags = var.tags
}

module "alb" {
  source  = "terraform-aws-modules/alb/aws"
  version = "~> 6.0"

  name               = local.app_name
  load_balancer_type = "application"
  internal           = false

  vpc_id          = var.vpc_id
  subnets         = data.aws_subnet_ids.public.ids
  security_groups = [aws_security_group.listener.id]

  target_groups = [
    {
      name                 = local.target_group_name
      backend_protocol     = "HTTP"
      backend_port         = 80
      target_type          = "ip"
      deregistration_delay = var.deregistration_delay
      health_check = {
        enabled             = true
        interval            = 30
        path                = "/"
        port                = "traffic-port"
        healthy_threshold   = 3
        unhealthy_threshold = 3
        timeout             = 10
        protocol            = "HTTP"
        matcher             = "200-399"
      }
      protocol_version = "HTTP1"

      tags = var.tags
    }
  ]

  https_listeners = [
    {
      port               = var.alb_listener_port
      protocol           = var.alb_listener_protocol
      certificate_arn    = module.acm_request_certificate.arn
      target_group_index = 0
    }
  ]
  tags = var.tags
}

module "acm_request_certificate" {
  source  = "cloudposse/acm-request-certificate/aws"
  version = "0.16.0"

  domain_name                       = "${local.app_name}.${var.domain_name}"
  name                              = var.app_name
  process_domain_validation_options = true
  ttl                               = "300"
  subject_alternative_names         = ["*.${var.domain_name}"]
  zone_name                         = data.aws_route53_zone.selected.name

  tags = var.tags
}

module "route53_record" {
  source  = "cloudposse/route53-alias/aws"
  version = "0.13.0"

  aliases         = [local.app_name]
  parent_zone_id  = data.aws_route53_zone.selected.zone_id
  target_dns_name = module.alb.lb_dns_name
  target_zone_id  = module.alb.lb_zone_id
  depends_on      = [aws_ecs_service.default, module.alb]

  tags = var.tags
}
