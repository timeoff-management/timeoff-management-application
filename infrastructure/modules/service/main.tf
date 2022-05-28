data "aws_ecs_cluster" "service" {
  cluster_name = var.cluster_name
}

resource "aws_lb_target_group" "primary" {
  name     = "${var.service_name}-main-tg"
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
  name     = "${var.service_name}-main-tg"
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
    security_groups  = var.security_groups
    subnets          = var.subnets
  }

  lifecycle {
    ignore_changes = [
      load_balancer,
      task_definition
    ]
  }

}