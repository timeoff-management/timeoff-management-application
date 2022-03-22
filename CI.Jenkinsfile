#!/usr/bin/env groovy

def ci = "tfpod-${UUID.randomUUID().toString()}"

podTemplate(
  label: ci,
  containers: [
    containerTemplate(name: 'docker', image: "docker:20.10.13-alpine3.15", ttyEnabled: true, alwaysPullImage: false, command: 'cat'),
    containerTemplate(name: 'builder', image: "dperezro/timeoff:build", ttyEnabled: true, alwaysPullImage: true, command: 'cat'),
    containerTemplate(name: 'kubeval', image: "garethr/kubeval:0.15.0", ttyEnabled: true, alwaysPullImage: false, command: 'cat'),
    containerTemplate(name: 'kustomize',image: "k8s.gcr.io/kustomize/kustomize:v3.8.7", ttyEnabled: true, alwaysPullImage: false, command: 'cat'),
  ]
) {
  timeout(60){
    timestamps {
      ansiColor('xterm') {
        node(ci) {
          try {
            container('kustomize') {
              stage('Git checkout') {
                checkout scm
              }
              stage('CI - Generate K8s manifests from templates') {
                dir("k8s"){
                  sh("/app/kustomize build overlays/dev > app.yaml")
                }
              } // stage end
            }
            container('kubeval') {
              stage('CI - Validate K8s manifests') {
                sh("/kubeval --ignore-missing-schemas k8s/*.yaml")
              } // stage end
            }
            container('builder') {
              stage('CI - Run Tests') {
                sh("npm ci")
                //Commenting the tests out since tests don't support ci silent tests (repo maintenance is too old and mostly dead). See the README, section "Run tests"
                //sh("npm test")
              } // stage end
            }
            container('docker') {
              stage('CI - Build image') {
                sh("docker build --target=ready --tag dperezro/timeoff:ci .")
              } // stage end
            }
          } catch(err) {
            if (err.toString().contains('FlowInterruptedException')) {
              currentBuild.result = 'UNSTABLE'
              echo "Pipeline Aborted/Timed Out"
            } else {
              currentBuild.result = 'FAILURE'
              echo """
                Pipeline failed. Please see error information below:

                ${err}

              """.stripIndent()
            }
          } finally {}
        }
      }
    }
  }
}
