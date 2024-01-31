data "aws_ecs_cluster" "service" {
  cluster_name = var.cluster_name
}

resource "aws_lb_target_group" "primary" {
  name        = "${var.service_name}-main-tg"
  port        = var.container_port
  protocol    = var.protocol
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 10
    interval            = 300
    matcher             = "200-499"
    path                = "/register"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 120
    unhealthy_threshold = 10
  }

  stickiness {
    cookie_duration = 86400
    enabled         = false
    type            = "lb_cookie"
  }


}

resource "aws_lb_target_group" "secondary" {
  name        = "${var.service_name}-main-tg"
  port        = var.container_port
  protocol    = var.protocol
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 10
    interval            = 300
    matcher             = "200-499"
    path                = "/register"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 120
    unhealthy_threshold = 10
  }

  stickiness {
    cookie_duration = 86400
    enabled         = false
    type            = "lb_cookie"
  }
}

resource "aws_lb_listener_rule" "main_http" {
  listener_arn = var.http_alb_listener_arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.primary.arn
  }

  condition {
    host_header {
      values = ["timeoff.dereedere.link"]
    }
  }
}

resource "aws_lb_listener_rule" "main_https" {
  listener_arn = var.https_alb_listener_arn

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.primary.arn
  }

  condition {
    host_header {
      values = ["timeoff.dereedere.link"]
    }
  }
}

# TO-DO:
# Figure out how the manage the secondary needed target group

resource "aws_ecs_service" "main" {
  name            = var.service_name
  cluster         = data.aws_ecs_cluster.service.arn
  task_definition = var.task_definition_name
  desired_count   = var.desired_count
  iam_role        = var.iam_role
  deployment_controller {
    type = "CODE_DEPLOY"
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.primary.arn
    container_name   = var.container_name
    container_port   = var.container_port
  }

  network_configuration {
    assign_public_ip = true
    security_groups  = [module.sg.security_group_id]
    subnets          = var.subnets
  }

  lifecycle {
    ignore_changes = [
      load_balancer,
      task_definition
    ]
  }

}

module "sg" {
  source      = "terraform-aws-modules/security-group/aws"
  version     = "4.9.0"
  name        = "${var.service_name}-sg"
  description = "Security Group for ${var.service_name}"
  vpc_id      = var.vpc_id
  ingress_with_source_security_group_id = [
    {
      from_port                = 0
      to_port                  = 65535
      protocol                 = "tcp"
      description              = "From ALB"
      source_security_group_id = var.alb_security_group_id
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