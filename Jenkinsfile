pipeline {
    agent any

    stages {
        stage('Linting'){
            steps{
            echo 'Docker linting..'
            sh 'docker run --rm -i hadolint/hadolint < Dockerfile | tee -a hadolint_lint.txt'
            }
        }
        stage('Build'){
            agent {
                docker{
                    image 'node:13.0.1-buster-slim'
                    args '-p 5001:3000'   
                    }
                }
            steps{
                    echo 'Compiling app..'
                    sh 'npm install'
                }
            
        }

        stage('Testing App'){
            when {
                not {
                    branch 'master'
                }
            }
                steps{
                    echo 'Testing and Docker Package ..'
                    script {
                            docker.withRegistry('https://index.docker.io/v1/', 'dockerlogin'){
                            def timeimage = docker.build("jlargaespada/timeapp:v${env.BUILD_ID}", ".")
                            timeimage.run("-p 5001:3000 --rm --name time-app")
                    }
                } 
            }
        }
        stage('Approve'){
            when {
                not {
                    branch 'master'
                }
            }
                steps{
                    sh 'sleep 20'
                    input message: 'Delivery via http://34.123.237.22:5001 ,The App is OK? (Click "Proceed" to continue)'
            }
        }
        
    }
     post {
        always {
            echo "Pipeline for time-app run is complete.."
            archiveArtifacts 'hadolint_lint.txt'
        }
        failure {
		slackSend (channel: "timeoff-management-application", message: "Build failure - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
        success {
		slackSend (channel: "timeoff-management-application", message: "Build succeeded - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        sh 'docker stop time-app'
        sh 'docker image prune -a -f'
        }
        aborted {
        slackSend (channel: "timeoff-management-application", message: "Build aborted - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        sh 'docker stop time-app'
        sh 'docker image prune -a -f'
        }
    }
}