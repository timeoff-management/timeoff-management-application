pipeline {
    agent none

    stages {

        stage('build'){
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
        stage('Docker Pre Package'){
            agent any
            steps{
                echo 'Building dev app..'
                script {
                    timeimage = docker.build("jlargaespada/timeapp:v${env.BUILD_ID}", ".")
                }
            } 
        }
    }
    stage('Test Image'){
        steps{
            sh "docker run -it -p 5001:3000 time-test jlargaespada/timeapp:v${env.BUILD_ID} "
        }
    }
    stage('Finish Test') {
            steps {
                input message: 'Finished using the web site? (Click "Proceed" to continue)'
                sh 'docker stop time-test'
                sh 'docker rm time-test'
            }
        }
    }
    stage('Docker Package'){
            agent any
            steps{
                echo 'Building dev app..'
                script {
                        docker.withRegistry('https://index.docker.io/v1/', 'dockerlogin'){
                            def timeimage = docker.build("jlargaespada/timeapp:v${env.BUILD_ID}", ".")
                        timeimage.push()
                        timeimage.push("${env.BRANCH_NAME}")
                        timeimage.push("latest")
                }
            } 
        }
    }
     post {
        always {
            echo "Pipeline for InstaApp run is complete.."
        }
        failure {
		slackSend (channel: "timeoff-management-application", message: "Build failure - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
        success {
		slackSend (channel: "timeoff-management-application", message: "Build succeeded - ${env.JOB_NAME} ${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)")
        }
    }
}
