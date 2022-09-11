resource "aws_lb" "gorilla_lb" {
  name                        = "${var.app_name}-lb"
  internal                    = false
  load_balancer_type          = "application"
  subnets                     = var.subnets
  security_groups             = var.security_groups
  ip_address_type             = "ipv4"
  enable_deletion_protection  = false
  tags                        = merge(var.tags, {Name= "${var.app_name}-lb"})
}

resource "aws_lb_listener" "gorilla_lbl_1" {
  load_balancer_arn = aws_lb.gorilla_lb.arn
  port              = "3000"
  protocol          = "HTTP" 

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.gorilla_lbtg.arn
  }
}

resource "aws_lb_listener" "gorilla_lbl_2" {
  load_balancer_arn = aws_lb.gorilla_lb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "3000"
      protocol    = "HTTP"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_target_group" "gorilla_lbtg" {
  name        = "${var.app_name}-lbtg"
  target_type = "ip"
  protocol    = "HTTP"
  port        = "3000"  
  vpc_id      = var.vpc_id
  tags        = merge(var.tags, {Name= "${var.app_name}-lbtg"})
  health_check {
          enabled             = true
          healthy_threshold   = 2
          interval            = 60
          matcher             = 200
          path                = "/login/"
          protocol            = "HTTP"
          timeout             = 10
          unhealthy_threshold = 5
        }
}

output "out_lbtg_arn" {
    value = aws_lb_target_group.gorilla_lbtg.arn
}