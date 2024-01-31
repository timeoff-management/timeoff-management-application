
resource "aws_codepipeline" "build" {
  name     = var.application_name
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = "bucket"
    type     = "S3"

  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = var.codestar_connection
        FullRepositoryId = var.repository_id
        BranchName       = var.source_branch
      }
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

      configuration = {
        ProjectName = var.codebuid_project_name
      }
    }
  }

}

resource "aws_codepipeline" "deploy" {
  name     = var.application_name
  role_arn = aws_iam_role.codepipeline_role.arn

  artifact_store {
    location = "bucket"
    type     = "S3"

  }
  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = var.codestar_connection
        FullRepositoryId = var.repository_id
        BranchName       = var.source_branch
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeDeploy"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]
      version          = "1"

      configuration = {
        ProjectName = var.codedeploy_app_name
      }
    }
  }

}




resource "aws_iam_role" "codepipeline_role" {
  name = "${var.application_name}-CodePipeline"

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

resource "aws_iam_role_policy" "code_deploy" {
  role = aws_iam_role.codepipeline_role.name

  policy = file("${path.module}/codePipeline.json")
}