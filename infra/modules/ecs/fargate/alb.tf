# alb.tf

resource "aws_alb" "main" {
  name            = "cb-load-balancer"
  subnets         = var.vpc_public_subet_ids
  security_groups = [aws_security_group.lb.id, var.vpc_default_sg_id]
}

resource "aws_alb_target_group" "app" {
  name        = "cb-target-group"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    healthy_threshold   = "3"
    interval            = "30"
    protocol            = "HTTP"
    matcher             = "200"
    timeout             = "3"
    path                = var.health_check_path
    unhealthy_threshold = "2"
  }
}

# Redirect all traffic from the ALB to the target group
resource "aws_alb_listener" "front_end" {
  load_balancer_arn = aws_alb.main.id
  port              = var.app_port
  protocol          = "HTTP"

  default_action {
    target_group_arn = aws_alb_target_group.app.id
    type             = "forward"
  }
}

