# CODE BUILD #
# 1. Pipeline S3 bucket
# 2. CodeBuild IAM Role
# 3. CodeBuild IAM Role Policy
# 4. CodeBuild Project

resource "aws_s3_bucket" "gorilla-pipelilne-s3bucket" {
  bucket = "${var.company_name}-pipeline-s3bucket"
  acl    = "private"
    tags = {
    Name        = "${var.company_name}-pipeline-s3"
    Billing     = "${var.billing_info}"
    Environment = "${var.environment_info}"
    }  
}

resource "aws_iam_role" "gorilla-cb-role" {
  name = "CB-Role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "gorilla-cb-rolepolicy" {
  role = "${aws_iam_role.gorilla-cb-role.name}"

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Resource": [
        "*"
      ],
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeDhcpOptions",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeVpcs"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterfacePermission"
      ],
      "Resource": [
        "arn:aws:ec2:us-west-2:683520202653:network-interface/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:*"
      ],
      "Resource": [
        "${aws_s3_bucket.gorilla-pipelilne-s3bucket.arn}",
        "${aws_s3_bucket.gorilla-pipelilne-s3bucket.arn}/*"
      ]
    }
  ]
}
POLICY
}

resource "aws_codebuild_project" "gorilla-cb-project" {
  name          = "${var.company_name}-${var.project}"
  description   = "${var.company_name}-${var.project}"
  build_timeout = "5"
  service_role  = "${aws_iam_role.gorilla-cb-role.arn}"

  artifacts {
    type = "S3"
    location = "${aws_s3_bucket.gorilla-pipelilne-s3bucket.id}"
    name = "timeoff-management"
    packaging = "ZIP"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/amazonlinux2-x86_64-standard:2.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "Build-Environment"
      value = "${var.company_name}-buildenvironment"
    }
  }

  source {
    type            = "GITHUB"
    location        = "${var.github_repo}"
    git_clone_depth = 1
  }

  tags = {
    Environment = "${var.environment_info}-${var.project}"
  }
}

resource "aws_codebuild_webhook" "gorilla-codebuild-webhook" {
  project_name = "${aws_codebuild_project.gorilla-cb-project.name}"

  filter_group {
    filter {
      type = "EVENT"
      pattern = "PUSH"
    }

    filter {
      type = "HEAD_REF"
      pattern = "master"
    }
  }
}

# CODE DEPLOY #
# 1. CodeDeploy IAM Role
# 2. CodeDeploy IAM Role Policy Attachement
# 3. CodeDeploy App -> Server
# 4. CodeDeploy DeploymentConfig
# 5. CodeDeploy DeploymentGroup

resource "aws_iam_role" "gorilla-cd-role" {
  name = "CD-Role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "Service": "codedeploy.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "AWSCodeDeployRole" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRole"
  role       = "${aws_iam_role.gorilla-cd-role.name}"
}

resource "aws_codedeploy_app" "gorilla-cd-app" {
  compute_platform = "Server"
  name             = "${var.company_name}-${var.environment_info}-ECS-BlueGreen-App"
}

resource "aws_codedeploy_deployment_config" "gorilla-cd-deploymentconfig" {
  deployment_config_name = "${var.company_name}-cd-deploymentconfig"

  minimum_healthy_hosts {
    type  = "HOST_COUNT"
    value = 2
  }
}

resource "aws_codedeploy_deployment_group" "gorilla-cd-deploymentgroup" {
  app_name              = "${aws_codedeploy_app.gorilla-cd-app.name}"
  deployment_group_name = "${var.company_name}-Server-BlueGreen-GroupDeployment"
  service_role_arn      = "${aws_iam_role.gorilla-cd-role.arn}"
  autoscaling_groups = ["${aws_autoscaling_group.gorilla-autoscalinggroup.name}"]

  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }

  load_balancer_info {
    elb_info {
      name = "${aws_elb.gorilla-elb.name}"
    }
  }

  blue_green_deployment_config {
    deployment_ready_option {
      action_on_timeout    = "STOP_DEPLOYMENT"
      wait_time_in_minutes = 15
    }

    green_fleet_provisioning_option {
      action = "COPY_AUTO_SCALING_GROUP"
    }

    terminate_blue_instances_on_deployment_success {
      action = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }
  }
}

# CODE PIPELINE #
# 1. CodePipeline IAM Role
# 2. CodePipeline IAM Role Policy
# 3. CodePipeline
#       - Source: CodeCommit -> S3 bucket
#       - Build
#       - Deploy

resource "aws_iam_role" "gorilla-cp-role" {
  name = "CP-Role"
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codepipeline.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "gorilla-cp-rolepolicy" {
  name = "Codepipeline_policy"
  role = "${aws_iam_role.gorilla-cp-role.id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect":"Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:GetBucketVersioning",
        "s3:*"
      ],
      "Resource": [
        "${aws_s3_bucket.gorilla-pipelilne-s3bucket.arn}",
        "${aws_s3_bucket.gorilla-pipelilne-s3bucket.arn}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "codebuild:BatchGetBuilds",
        "codebuild:StartBuild",
        "codebuild:*",
        "codecommit:CancelUploadArchive",
        "codecommit:GetBranch",
        "codecommit:GetCommit",
        "codecommit:GetUploadArchiveStatus",
        "codecommit:UploadArchive",
        "codecommit:*",
        "codedeploy:CreateDeployment",
        "codedeploy:GetApplication",
        "codedeploy:GetApplicationRevision",
        "codedeploy:GetDeployment",
        "codedeploy:GetDeploymentConfig",
        "codedeploy:RegisterApplicationRevision",
        "codedeploy:*"
      ],
      "Resource": "*"
    }
  ]
}
EOF
}

resource "aws_codepipeline" "gorilla-codepipeline" {
  name     = "${var.company_name}-codepipeline"
  role_arn = "${aws_iam_role.gorilla-cp-role.arn}"

  artifact_store {
    location = "${aws_s3_bucket.gorilla-pipelilne-s3bucket.bucket}"
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "S3"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        S3Bucket = "${var.pipeline-s3bucket}"
        S3ObjectKey = "timeoff-management.zip"
        PollForSourceChanges = true
      }
      # configuration = {
      #   Owner = "lungosta"
      #   Repo = "timeoff-management-application"
      #   BranchName = "master" 
      #   PollForSourceChanges = "false"
      #   # OAuthToken = ""
      # }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      version          = "1"

      configuration    = {
        ProjectName    =   "${aws_codebuild_project.gorilla-cb-project.name}"
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "CodeDeploy"
      input_artifacts = ["build_output"]
      version         = "1"

      configuration   = {
        ApplicationName = "${aws_codedeploy_app.gorilla-cd-app.name}"
        DeploymentGroupName = "${aws_codedeploy_deployment_group.gorilla-cd-deploymentgroup.deployment_group_name}"
      }

    }
  }
}